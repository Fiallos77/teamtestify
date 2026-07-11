import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { requireOrgContext, requireSpaceInOrg, tryOrgContext } from "./lib/authz";
import {
  aiFeatureLimit,
  aiFeatureUsed,
  aiRemaining,
  assertUnderAiQuota,
  getEntitlements,
  type AiFeature,
} from "./entitlements";
import { generateText } from "./lib/aiProvider";

// "YYYY-MM" in UTC — the bucket key for aiUsage. Kept explicit and injectable
// so the reservation mutation is deterministic in tests (month rollover) and
// the action passes the real current month.
export function currentMonth(nowMs: number = Date.now()): string {
  const d = new Date(nowMs);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

const featureValidator = v.union(v.literal("request"), v.literal("image"));

// Reserve one AI credit for (org, month, feature). Checks the plan quota
// against this month's usage and, only if there's headroom, increments the
// counter — all in one transaction, so it fails closed at the cap. Callers
// (the generate action) reserve BEFORE invoking the provider; an over-cap
// request throws here and never reaches Gemini.
export const reserveAiCredit = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    feature: featureValidator,
    month: v.string(),
  },
  handler: async (ctx, { organizationId, feature, month }) => {
    const entitlements = await getEntitlements(ctx, organizationId);
    const row = await ctx.db
      .query("aiUsage")
      .withIndex("by_org_and_month", (q) =>
        q.eq("organizationId", organizationId).eq("month", month)
      )
      .unique();

    const usage = {
      requestGenCount: row?.requestGenCount ?? 0,
      imageGenCount: row?.imageGenCount ?? 0,
    };
    assertUnderAiQuota(entitlements.aiQuota, usage, feature);

    const next = {
      requestGenCount: usage.requestGenCount + (feature === "request" ? 1 : 0),
      imageGenCount: usage.imageGenCount + (feature === "image" ? 1 : 0),
    };
    if (row) {
      await ctx.db.patch(row._id, next);
    } else {
      await ctx.db.insert("aiUsage", { organizationId, month, ...next });
    }

    return { remaining: aiRemaining(entitlements.aiQuota, next, feature) };
  },
});

// Owner/org-scoped read the generate action needs (actions can't touch the db
// directly). Also enforces that the space belongs to the caller's active org.
export const getAssistantContext = internalQuery({
  args: { spaceId: v.id("spaces") },
  handler: async (ctx, { spaceId }) => {
    const { org } = await requireOrgContext(ctx);
    const space = await requireSpaceInOrg(ctx, spaceId, org._id);
    return {
      organizationId: org._id,
      publicSlug: space.publicSlug,
      spaceName: space.name,
    };
  },
});

const kitValidator = v.object({
  outreachEmail: v.string(),
  outreachWhatsApp: v.string(),
  followUp: v.string(),
  guideQuestions: v.array(v.string()),
  language: v.optional(v.string()),
});

// Persist the owner's description and cache the generated kit on the space so
// the dashboard can re-show it without spending another credit.
export const saveRequestKit = internalMutation({
  args: { spaceId: v.id("spaces"), businessDescription: v.string(), kit: kitValidator },
  handler: async (ctx, { spaceId, businessDescription, kit }) => {
    await ctx.db.patch(spaceId, {
      businessDescription,
      requestAssistant: { ...kit, generatedAt: Date.now() },
    });
  },
});

export interface RequestKit {
  outreachEmail: string;
  outreachWhatsApp: string;
  followUp: string;
  guideQuestions: string[];
  language?: string;
  remaining: number;
}

const REQUEST_KIT_SYSTEM = [
  "You help a small business owner collect customer testimonials.",
  "Given a one-sentence description of their business, produce a short outreach",
  "kit. Write everything in the SAME LANGUAGE the description is written in.",
  "Keep it warm, concise, and specific to their industry. Always include the",
  "provided collection link verbatim in both the email and WhatsApp messages.",
  "Return exactly 3 short guide questions a happy customer could answer.",
].join(" ");

const REQUEST_KIT_SCHEMA = {
  type: "object",
  properties: {
    outreachEmail: { type: "string" },
    outreachWhatsApp: { type: "string" },
    guideQuestions: { type: "array", items: { type: "string" } },
    followUp: { type: "string" },
  },
  required: ["outreachEmail", "outreachWhatsApp", "guideQuestions", "followUp"],
};

function collectionLink(publicSlug: string): string {
  // APP_URL is the canonical app origin (Convex env). Falls back to a relative
  // path so we never bake in a localhost origin — see docs/pre-launch.md.
  const base = (process.env.APP_URL ?? "").replace(/\/$/, "");
  return base ? `${base}/r/${publicSlug}` : `/r/${publicSlug}`;
}

function buildRequestPrompt(input: {
  businessDescription: string;
  spaceName: string;
  link: string;
}): string {
  return [
    `Business (one sentence): ${input.businessDescription}`,
    `Collection page name: ${input.spaceName}`,
    `Collection link to include: ${input.link}`,
    "",
    "Produce: an outreach email, an outreach WhatsApp message, exactly 3 guide",
    "questions, and a follow-up reminder message. Respond in the language of the",
    "business description above.",
  ].join("\n");
}

function parseRequestKit(raw: string): {
  outreachEmail: string;
  outreachWhatsApp: string;
  followUp: string;
  guideQuestions: string[];
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("The AI response could not be read. Please try again.");
  }
  const obj = (parsed ?? {}) as Record<string, unknown>;
  const str = (val: unknown) => (typeof val === "string" ? val.trim() : "");
  const questions = Array.isArray(obj.guideQuestions)
    ? obj.guideQuestions.map((q) => str(q)).filter(Boolean).slice(0, 3)
    : [];
  return {
    outreachEmail: str(obj.outreachEmail),
    outreachWhatsApp: str(obj.outreachWhatsApp),
    followUp: str(obj.followUp),
    guideQuestions: questions,
  };
}

// Generate the request-assistant kit end to end: verify ownership, reserve a
// "request" credit (fails closed at the cap), call Gemini, persist + return.
export const generateRequestKit = action({
  args: { spaceId: v.id("spaces"), businessDescription: v.string() },
  handler: async (ctx, { spaceId, businessDescription }): Promise<RequestKit> => {
    const description = businessDescription.trim();
    if (!description) {
      throw new Error("Describe your business in a sentence first.");
    }

    const { organizationId, publicSlug, spaceName } = await ctx.runQuery(
      internal.ai.getAssistantContext,
      { spaceId }
    );

    // Reserve first — over-cap requests never reach the provider.
    const { remaining } = await ctx.runMutation(internal.ai.reserveAiCredit, {
      organizationId,
      feature: "request" as AiFeature,
      month: currentMonth(),
    });

    const link = collectionLink(publicSlug);
    const raw = await generateText({
      system: REQUEST_KIT_SYSTEM,
      prompt: buildRequestPrompt({ businessDescription: description, spaceName, link }),
      responseMimeType: "application/json",
      responseSchema: REQUEST_KIT_SCHEMA,
    });
    const kit = parseRequestKit(raw);

    await ctx.runMutation(internal.ai.saveRequestKit, {
      spaceId,
      businessDescription: description,
      kit,
    });

    return { ...kit, remaining };
  },
});

// Remaining AI credits for the active org this month, for the dashboard.
// Page-safe (returns null when no org is active yet) like other dashboard reads.
export const getUsage = query({
  args: {},
  handler: async (ctx) => {
    const orgContext = await tryOrgContext(ctx);
    if (!orgContext) return null;
    const organizationId: Id<"organizations"> = orgContext.org._id;

    const entitlements = await getEntitlements(ctx, organizationId);
    const month = currentMonth();
    const row = await ctx.db
      .query("aiUsage")
      .withIndex("by_org_and_month", (q) =>
        q.eq("organizationId", organizationId).eq("month", month)
      )
      .unique();
    const usage = {
      requestGenCount: row?.requestGenCount ?? 0,
      imageGenCount: row?.imageGenCount ?? 0,
    };
    const quota = entitlements.aiQuota;

    const forFeature = (feature: AiFeature) => ({
      used: aiFeatureUsed(quota, usage, feature),
      limit: aiFeatureLimit(quota, feature),
      remaining: aiRemaining(quota, usage, feature),
    });

    return {
      plan: entitlements.plan,
      metering: quota.metering,
      watermark: quota.watermark,
      month,
      request: forFeature("request"),
      image: forFeature("image"),
    };
  },
});
