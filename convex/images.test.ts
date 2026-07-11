import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import { parseImageProposals } from "./images";
import { verifyRenderToken } from "./lib/imageToken";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");
function newTestConvex() {
  return convexTest(schema, modules);
}

const SUBJECT = "user_owner";

async function seedOwnedOrgWithTestimonial(
  t: ReturnType<typeof newTestConvex>,
  opts: { pro?: boolean; type?: "text" | "video"; textContent?: string } = {}
) {
  return await t.run(async (ctx) => {
    const organizationId = await ctx.db.insert("organizations", { name: "Acme", createdAt: Date.now() });
    await ctx.db.insert("organizationMembers", {
      organizationId, authUserId: SUBJECT, role: "owner", createdAt: Date.now(),
    });
    await ctx.db.insert("userSettings", { authUserId: SUBJECT, activeOrganizationId: organizationId });
    if (opts.pro) {
      await ctx.db.insert("subscriptions", { organizationId, plan: "pro", status: "active" });
    }
    const spaceId = await ctx.db.insert("spaces", {
      organizationId, name: "Space", publicSlug: `s-${Math.random().toString(36).slice(2)}`,
      formConfig: { headline: "h", questions: [], collectRating: false, collectNameCompanyPhoto: false, allowText: true, allowVideo: true },
      branding: { primaryColor: "#0ea5e9" }, isActive: true, createdAt: Date.now(),
    });
    const testimonialId = await ctx.db.insert("testimonials", {
      spaceId, organizationId, type: opts.type ?? "text", status: "approved",
      authorName: "María González", authorTitle: "Fundadora", authorCompany: "Estudio Brío",
      rating: 5, textContent: opts.textContent ?? "Nos ahorró horas cada semana.",
      ...(opts.type === "video" ? { videoStorage: { provider: "convex" as const } } : {}),
      featured: false, tags: [], source: "form" as const, submittedAt: Date.now(), reviewedAt: Date.now(),
    });
    return { organizationId, testimonialId };
  });
}

function geminiResponse(proposalsJson: string) {
  return new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text: proposalsJson }] } }] }),
    { status: 200 }
  );
}

const validProposals = JSON.stringify({
  proposals: [
    { layout: "giant-quote", headline: "Recuperamos horas cada semana" },
    { layout: "vibrant-solid", headline: "El equipo por fin respira" },
  ],
});

const originalFetch = global.fetch;
const env = { GEMINI_API_KEY: process.env.GEMINI_API_KEY, IMAGE_RENDER_SECRET: process.env.IMAGE_RENDER_SECRET, GROQ_API_KEY: process.env.GROQ_API_KEY };

beforeEach(() => {
  process.env.GEMINI_API_KEY = "gk_test";
  process.env.IMAGE_RENDER_SECRET = "test-secret";
  delete process.env.GROQ_API_KEY; // transcription off by default
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

describe("parseImageProposals", () => {
  test("keeps valid, distinct layouts and caps at 3", () => {
    const raw = JSON.stringify({
      proposals: [
        { layout: "giant-quote", headline: "A" },
        { layout: "giant-quote", headline: "dup layout dropped" },
        { layout: "nonsense", headline: "bad layout dropped" },
        { layout: "vibrant-solid", headline: "B" },
        { layout: "dark-premium", headline: "C" },
        { layout: "cta-footer", headline: "D over cap" },
      ],
    });
    const out = parseImageProposals(raw);
    expect(out).toHaveLength(3);
    expect(out.map((p) => p.layout)).toEqual(["giant-quote", "vibrant-solid", "dark-premium"]);
  });

  test("accepts a bare array too", () => {
    const out = parseImageProposals(JSON.stringify([{ layout: "elegant-neutral", headline: "hi" }]));
    expect(out).toEqual([{ layout: "elegant-neutral", headline: "hi" }]);
  });

  test("throws when nothing usable survives", () => {
    expect(() => parseImageProposals(JSON.stringify({ proposals: [{ layout: "x", headline: "y" }] }))).toThrow();
    expect(() => parseImageProposals("not json")).toThrow();
  });
});

describe("generateImageProposal action", () => {
  test("free: reserves an image credit and signs watermark=true into the token", async () => {
    const t = newTestConvex();
    const { organizationId, testimonialId } = await seedOwnedOrgWithTestimonial(t);
    global.fetch = vi.fn(async () => geminiResponse(validProposals)) as unknown as typeof fetch;

    const asOwner = t.withIdentity({ subject: SUBJECT });
    const result = await asOwner.action(api.images.generateImageProposal, { testimonialId });

    expect(result.proposals).toHaveLength(2);
    expect(result.watermark).toBe(true);
    expect(await imageUsage(t, organizationId)).toBe(1);

    const verified = await verifyRenderToken(result.token);
    expect(verified?.watermark).toBe(true);
    expect(verified?.primaryColor).toBe("#0ea5e9");
    expect(verified?.content.authorName).toBe("María González");
  });

  test("pro: watermark=false in the token", async () => {
    const t = newTestConvex();
    const { testimonialId } = await seedOwnedOrgWithTestimonial(t, { pro: true });
    global.fetch = vi.fn(async () => geminiResponse(validProposals)) as unknown as typeof fetch;

    const result = await t.withIdentity({ subject: SUBJECT }).action(api.images.generateImageProposal, { testimonialId });
    expect(result.watermark).toBe(false);
    expect((await verifyRenderToken(result.token))?.watermark).toBe(false);
  });

  test("refunds the credit when the model returns junk", async () => {
    const t = newTestConvex();
    const { organizationId, testimonialId } = await seedOwnedOrgWithTestimonial(t);
    global.fetch = vi.fn(async () => geminiResponse("not-json-at-all")) as unknown as typeof fetch;

    await expect(
      t.withIdentity({ subject: SUBJECT }).action(api.images.generateImageProposal, { testimonialId })
    ).rejects.toThrow();
    expect(await imageUsage(t, organizationId)).toBe(0);
  });

  test("video testimonial with no transcript still produces proposals (graceful)", async () => {
    const t = newTestConvex();
    const { testimonialId } = await seedOwnedOrgWithTestimonial(t, { type: "video", textContent: "" });
    // GROQ_API_KEY unset -> transcribeAudio returns "" without calling out; the
    // video serving-url fetch also isn't needed. Gemini still returns proposals.
    global.fetch = vi.fn(async (url: unknown) => {
      if (String(url).includes("generativelanguage")) return geminiResponse(validProposals);
      return new Response("", { status: 200 }); // video blob fetch, if any
    }) as unknown as typeof fetch;

    const result = await t.withIdentity({ subject: SUBJECT }).action(api.images.generateImageProposal, { testimonialId });
    expect(result.proposals.length).toBeGreaterThanOrEqual(1);
  });
});
