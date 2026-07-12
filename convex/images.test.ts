import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import { parseAiProposals } from "./images";
import { verifyRenderToken } from "./lib/imageToken";
import { LAYOUT_IDS, LAYOUT_SET } from "./lib/imageLayouts";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");
function newTestConvex() {
  return convexTest(schema, modules);
}

const SUBJECT = "user_owner";

async function seed(
  t: ReturnType<typeof newTestConvex>,
  opts: { pro?: boolean; type?: "text" | "video"; textContent?: string } = {}
) {
  return await t.run(async (ctx) => {
    const organizationId = await ctx.db.insert("organizations", { name: "Acme", createdAt: Date.now() });
    await ctx.db.insert("organizationMembers", { organizationId, authUserId: SUBJECT, role: "owner", createdAt: Date.now() });
    await ctx.db.insert("userSettings", { authUserId: SUBJECT, activeOrganizationId: organizationId });
    if (opts.pro) await ctx.db.insert("subscriptions", { organizationId, plan: "pro", status: "active" });
    const spaceId = await ctx.db.insert("spaces", {
      organizationId, name: "Space", publicSlug: `s-${Math.random().toString(36).slice(2)}`,
      formConfig: { headline: "h", questions: [], collectRating: false, collectNameCompanyPhoto: false, allowText: true, allowVideo: true },
      branding: { primaryColor: "#0ea5e9" }, imageFooterText: "acme.com", isActive: true, createdAt: Date.now(),
    });
    const testimonialId = await ctx.db.insert("testimonials", {
      spaceId, organizationId, type: opts.type ?? "text", status: "approved",
      authorName: "María González", authorTitle: "Fundadora", authorCompany: "Estudio Brío", rating: 5,
      textContent: opts.textContent ?? "Nos ahorró horas cada semana.",
      ...(opts.type === "video" ? { videoStorage: { provider: "convex" as const } } : {}),
      featured: false, tags: [], source: "form" as const, submittedAt: Date.now(), reviewedAt: Date.now(),
    });
    return { organizationId, testimonialId };
  });
}

// A Gemini reply covering ALL 14 layouts, so whichever 3 the server randomly
// picks are present. bgType controls the requested background.
function geminiAllLayouts(bgType: "photo" | "texture" | "solid") {
  const proposals = LAYOUT_IDS.map((layout) => ({
    layout,
    headline: `Great with ${layout}`,
    headerLabel: "Testimonio de Cliente",
    backgroundType: bgType,
    pexelsQuery: bgType === "photo" ? "office" : undefined,
  }));
  const text = JSON.stringify({ proposals });
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 });
}

function routeFetch(bgType: "photo" | "texture" | "solid", opts: { pexels?: boolean } = {}) {
  return vi.fn(async (url: unknown) => {
    const u = String(url);
    if (u.includes("generativelanguage")) return geminiAllLayouts(bgType);
    if (u.includes("api.pexels.com")) {
      return opts.pexels
        ? new Response(JSON.stringify({ photos: [{ src: { large2x: "https://images.pexels.com/photos/1/x.jpg" } }] }), { status: 200 })
        : new Response("no key", { status: 401 });
    }
    return new Response("", { status: 200 });
  }) as unknown as typeof fetch;
}

const env = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  IMAGE_RENDER_SECRET: process.env.IMAGE_RENDER_SECRET,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  PEXELS_API_KEY: process.env.PEXELS_API_KEY,
};
const originalFetch = global.fetch;
beforeEach(() => {
  process.env.GEMINI_API_KEY = "gk_test";
  process.env.IMAGE_RENDER_SECRET = "test-secret";
  delete process.env.GROQ_API_KEY;
  delete process.env.PEXELS_API_KEY;
});
afterEach(() => {
  global.fetch = originalFetch;
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  vi.restoreAllMocks();
});

async function imageUsage(t: ReturnType<typeof newTestConvex>, organizationId: Id<"organizations">) {
  const row = await t.run(async (ctx) =>
    await ctx.db.query("aiUsage").withIndex("by_org_and_month", (q) => q.eq("organizationId", organizationId)).first()
  );
  return row?.imageGenCount ?? 0;
}
async function lastLayouts(t: ReturnType<typeof newTestConvex>, organizationId: Id<"organizations">) {
  const org = await t.run(async (ctx) => await ctx.db.get(organizationId));
  return org?.lastImageLayouts ?? [];
}

describe("parseAiProposals", () => {
  test("keeps valid entries keyed by layout, ignoring unknown layouts / empty headlines", () => {
    const raw = JSON.stringify({
      proposals: [
        { layout: "gold-luxe", headline: "A", headerLabel: "H", backgroundType: "solid" },
        { layout: "nonsense", headline: "bad", backgroundType: "solid" },
        { layout: "big-statement", headline: "", backgroundType: "solid" },
        { layout: "sparkle-accent", headline: "B", backgroundType: "weird" },
      ],
    });
    const map = parseAiProposals(raw);
    expect(Object.keys(map).sort()).toEqual(["gold-luxe", "sparkle-accent"]);
    expect(map["sparkle-accent"].backgroundType).toBe("texture"); // invalid -> texture
  });

  test("tolerates code fences and throws only on unreadable output", () => {
    const fenced = '```json\n{"proposals":[{"layout":"dark-premium","headline":"x","backgroundType":"photo","pexelsQuery":"night"}]}\n```';
    expect(parseAiProposals(fenced)["dark-premium"].backgroundType).toBe("photo");
    expect(() => parseAiProposals("not json")).toThrow();
  });
});

describe("generateImageProposal action", () => {
  test("free: 3 valid proposals, watermark=true in token, records the 3 layouts", async () => {
    const t = newTestConvex();
    const { organizationId, testimonialId } = await seed(t);
    global.fetch = routeFetch("texture");

    const res = await t.withIdentity({ subject: SUBJECT }).action(api.images.generateImageProposal, { testimonialId });
    expect(res.proposals).toHaveLength(3);
    expect(new Set(res.proposals.map((p) => p.layout)).size).toBe(3);
    expect(res.proposals.every((p) => LAYOUT_SET.has(p.layout) && p.headline)).toBe(true);
    expect(res.watermark).toBe(true);
    expect(res.footer).toBe("acme.com");
    expect((await verifyRenderToken(res.token))?.watermark).toBe(true);
    expect(await imageUsage(t, organizationId)).toBe(1);

    const recorded = await lastLayouts(t, organizationId);
    expect(recorded.sort()).toEqual(res.proposals.map((p) => p.layout).sort());
  });

  test("second generation never repeats the exact previous 3 layouts", async () => {
    const t = newTestConvex();
    const { organizationId, testimonialId } = await seed(t, { pro: true });
    global.fetch = routeFetch("texture");
    const asOwner = t.withIdentity({ subject: SUBJECT });

    const first = (await asOwner.action(api.images.generateImageProposal, { testimonialId })).proposals.map((p) => p.layout);
    const second = (await asOwner.action(api.images.generateImageProposal, { testimonialId })).proposals.map((p) => p.layout);
    const sameSet = first.length === second.length && new Set([...first, ...second]).size === 3;
    expect(sameSet).toBe(false);
  });

  test("pro: watermark=false", async () => {
    const t = newTestConvex();
    const { testimonialId } = await seed(t, { pro: true });
    global.fetch = routeFetch("texture");
    const res = await t.withIdentity({ subject: SUBJECT }).action(api.images.generateImageProposal, { testimonialId });
    expect(res.watermark).toBe(false);
    expect((await verifyRenderToken(res.token))?.watermark).toBe(false);
  });

  test("pexels: without a key, photo requests degrade to texture", async () => {
    const t = newTestConvex();
    const { testimonialId } = await seed(t);
    global.fetch = routeFetch("photo", { pexels: false }); // no PEXELS_API_KEY set
    const res = await t.withIdentity({ subject: SUBJECT }).action(api.images.generateImageProposal, { testimonialId });
    expect(res.proposals.every((p) => p.backgroundType !== "photo")).toBe(true);
    expect(res.proposals.every((p) => !p.bgPhotoUrl)).toBe(true);
  });

  test("pexels: with a key + result, photo proposals carry a bg url", async () => {
    const t = newTestConvex();
    const { testimonialId } = await seed(t);
    process.env.PEXELS_API_KEY = "pk_test";
    global.fetch = routeFetch("photo", { pexels: true });
    const res = await t.withIdentity({ subject: SUBJECT }).action(api.images.generateImageProposal, { testimonialId });
    expect(res.proposals.some((p) => p.backgroundType === "photo" && p.bgPhotoUrl?.includes("images.pexels.com"))).toBe(true);
  });

  test("refunds the credit when the model returns junk", async () => {
    const t = newTestConvex();
    const { organizationId, testimonialId } = await seed(t);
    global.fetch = vi.fn(async (url: unknown) =>
      String(url).includes("generativelanguage")
        ? new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "not json" }] } }] }), { status: 200 })
        : new Response("", { status: 200 })
    ) as unknown as typeof fetch;
    await expect(t.withIdentity({ subject: SUBJECT }).action(api.images.generateImageProposal, { testimonialId })).rejects.toThrow();
    expect(await imageUsage(t, organizationId)).toBe(0);
  });

  test("video with no transcript still produces proposals (graceful)", async () => {
    const t = newTestConvex();
    const { testimonialId } = await seed(t, { type: "video", textContent: "" });
    global.fetch = routeFetch("texture");
    const res = await t.withIdentity({ subject: SUBJECT }).action(api.images.generateImageProposal, { testimonialId });
    expect(res.proposals.length).toBe(3);
  });
});
