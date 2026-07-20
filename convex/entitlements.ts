import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

type Ctx = QueryCtx | MutationCtx;

// Plan Matrix — source of truth per teamtestify-v2-spec.md. Every
// mutation/query that needs to know what an org can do goes through
// getEntitlements or one of the assert* guards below, never an inline
// plan check.
export const FREE_MAX_SPACES = 1;
export const PRO_MAX_SPACES = 5;
export const FREE_MAX_PUBLISHED_TESTIMONIALS = 15;
export const FREE_MAX_PUBLISHED_VIDEO_TESTIMONIALS = 2;
export const FREE_MAX_VIDEO_SECONDS = 120;
export const PRO_MAX_VIDEO_SECONDS = 180;
export const FREE_MAX_TEAM_MEMBERS = 1;
export const PRO_MAX_TEAM_MEMBERS = 3;
// AI generation quotas. Free meters each feature separately (per_feature);
// Pro meters request + image against one shared monthly pool (combined). The
// aiUsage table (convex/schema.ts) tracks per-feature counts per month; the
// pure helpers below turn a plan's quota + a month's usage into limit / used /
// remaining, and every AI entry point fails closed at the cap.
export type AiFeature = "request" | "image";

export interface AiQuota {
  metering: "per_feature" | "combined";
  requestGensPerMonth: number; // used when metering === "per_feature"
  imageGensPerMonth: number; // used when metering === "per_feature"
  combinedGensPerMonth: number; // used when metering === "combined"
  watermark: boolean;
}

export interface AiUsageCounts {
  requestGenCount: number;
  imageGenCount: number;
}

export const FREE_AI_REQUEST_GENS_PER_MONTH = 1;
export const FREE_AI_IMAGE_GENS_PER_MONTH = 3;
export const PRO_AI_COMBINED_GENS_PER_MONTH = 100;
// Reserved for a future third tier (e.g. Agency). Not wired to any plan yet —
// drop the real number in here and add the plan's AiQuota when that tier ships.
export const RESERVED_TIER_AI_COMBINED_GENS_PER_MONTH = 500;

const FREE_AI_QUOTA: AiQuota = {
  metering: "per_feature",
  requestGensPerMonth: FREE_AI_REQUEST_GENS_PER_MONTH,
  imageGensPerMonth: FREE_AI_IMAGE_GENS_PER_MONTH,
  combinedGensPerMonth: 0,
  watermark: true,
};

const PRO_AI_QUOTA: AiQuota = {
  metering: "combined",
  requestGensPerMonth: 0,
  imageGensPerMonth: 0,
  combinedGensPerMonth: PRO_AI_COMBINED_GENS_PER_MONTH,
  watermark: false,
};

export interface Entitlements {
  plan: "free" | "pro";
  maxSpaces: number;
  // null means unlimited.
  maxPublishedTestimonials: number | null;
  maxPublishedVideoTestimonials: number | null;
  maxVideoSeconds: number;
  badgeRemovable: boolean;
  customDomain: boolean;
  richSnippets: boolean;
  aiQuota: AiQuota;
  maxTeamMembers: number;
}

const FREE_ENTITLEMENTS: Entitlements = {
  plan: "free",
  maxSpaces: FREE_MAX_SPACES,
  maxPublishedTestimonials: FREE_MAX_PUBLISHED_TESTIMONIALS,
  maxPublishedVideoTestimonials: FREE_MAX_PUBLISHED_VIDEO_TESTIMONIALS,
  maxVideoSeconds: FREE_MAX_VIDEO_SECONDS,
  badgeRemovable: false,
  customDomain: false,
  richSnippets: false,
  aiQuota: FREE_AI_QUOTA,
  maxTeamMembers: FREE_MAX_TEAM_MEMBERS,
};

const PRO_ENTITLEMENTS: Entitlements = {
  plan: "pro",
  maxSpaces: PRO_MAX_SPACES,
  maxPublishedTestimonials: null,
  maxPublishedVideoTestimonials: null,
  maxVideoSeconds: PRO_MAX_VIDEO_SECONDS,
  badgeRemovable: true,
  customDomain: true,
  richSnippets: true,
  aiQuota: PRO_AI_QUOTA,
  maxTeamMembers: PRO_MAX_TEAM_MEMBERS,
};

// Free is the absence of an active pro subscription — no row, a "free"
// row, or a pro row that's lapsed (canceled/past_due/incomplete) all
// resolve to the free plan.
export async function getEntitlements(
  ctx: Ctx,
  organizationId: Id<"organizations">
): Promise<Entitlements> {
  const subscription = await ctx.db
    .query("subscriptions")
    .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
    .unique();
  const isActivePro = subscription?.plan === "pro" && subscription.status === "active";
  return isActivePro ? PRO_ENTITLEMENTS : FREE_ENTITLEMENTS;
}

export async function assertCanCreateSpace(ctx: Ctx, organizationId: Id<"organizations">) {
  const entitlements = await getEntitlements(ctx, organizationId);
  const spaces = await ctx.db
    .query("spaces")
    .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
    .collect();
  if (spaces.length >= entitlements.maxSpaces) {
    throw new Error(
      `Your plan allows up to ${entitlements.maxSpaces} space(s). Upgrade to Pro for more.`
    );
  }
}

// Full approved set for a plan — used where every row is genuinely needed
// (applyDowngradeToFree sorts and buckets all of them). Index-scoped to
// "approved" so this is a scan of just the approved rows, not the org's
// entire testimonial history.
async function countApprovedTestimonials(ctx: Ctx, organizationId: Id<"organizations">) {
  return await ctx.db
    .query("testimonials")
    .withIndex("by_org_and_status", (q) =>
      q.eq("organizationId", organizationId).eq("status", "approved")
    )
    .collect();
}

// Returns the approved set it fetched (bounded to limit + 1 — just enough to
// tell whether the cap is exceeded) so setStatus can hand it straight to
// assertCanPublishVideo instead of that function re-scanning the same data.
// null means "unlimited plan, nothing fetched" — not "zero approved".
export async function assertCanPublish(
  ctx: Ctx,
  organizationId: Id<"organizations">
): Promise<Doc<"testimonials">[] | null> {
  const entitlements = await getEntitlements(ctx, organizationId);
  if (entitlements.maxPublishedTestimonials === null) return null;
  const approved = await ctx.db
    .query("testimonials")
    .withIndex("by_org_and_status", (q) =>
      q.eq("organizationId", organizationId).eq("status", "approved")
    )
    .take(entitlements.maxPublishedTestimonials + 1);
  if (approved.length >= entitlements.maxPublishedTestimonials) {
    throw new Error(
      `Your plan allows up to ${entitlements.maxPublishedTestimonials} published testimonials. Upgrade to Pro for unlimited.`
    );
  }
  return approved;
}

// Accepts the array assertCanPublish already fetched so the two checks share
// one database read instead of each doing their own full pass — falls back
// to its own (index-scoped) fetch when called on its own, e.g. from tests.
export async function assertCanPublishVideo(
  ctx: Ctx,
  organizationId: Id<"organizations">,
  preFetchedApproved?: Doc<"testimonials">[] | null
) {
  const entitlements = await getEntitlements(ctx, organizationId);
  if (entitlements.maxPublishedVideoTestimonials === null) return;
  const approved = preFetchedApproved ?? (await countApprovedTestimonials(ctx, organizationId));
  const approvedVideoCount = approved.filter((t) => t.type === "video").length;
  if (approvedVideoCount >= entitlements.maxPublishedVideoTestimonials) {
    throw new Error(
      `Your plan allows up to ${entitlements.maxPublishedVideoTestimonials} published video testimonials. Upgrade to Pro for unlimited.`
    );
  }
}

// Downgrade behavior per the Plan Matrix section of teamtestify-v2-spec.md:
// keep the 15 most recently published testimonials visible (max 2 video),
// unpublish the rest WITHOUT deleting, and store enough state to restore
// instantly on re-upgrade. "Unpublish" here means flipping status back to
// pending (not "rejected" — that would misrepresent it as a moderation
// decision) and marking downgradeHidden so re-upgrade knows exactly which
// ones to restore, without touching testimonials that were never approved
// or were genuinely rejected by a human.
export async function applyDowngradeToFree(ctx: MutationCtx, organizationId: Id<"organizations">) {
  const approved = await countApprovedTestimonials(ctx, organizationId);
  approved.sort((a, b) => (b.reviewedAt ?? b.submittedAt) - (a.reviewedAt ?? a.submittedAt));

  const kept = new Set<Id<"testimonials">>();
  let keptVideoCount = 0;
  for (const testimonial of approved) {
    if (kept.size >= FREE_MAX_PUBLISHED_TESTIMONIALS) break;
    if (testimonial.type === "video") {
      if (keptVideoCount >= FREE_MAX_PUBLISHED_VIDEO_TESTIMONIALS) continue;
      keptVideoCount++;
    }
    kept.add(testimonial._id);
  }

  for (const testimonial of approved) {
    if (kept.has(testimonial._id)) continue;
    await ctx.db.patch(testimonial._id, { status: "pending", downgradeHidden: true });
  }
}

export async function applyReUpgradeToPro(ctx: MutationCtx, organizationId: Id<"organizations">) {
  const testimonials = await ctx.db
    .query("testimonials")
    .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
    .collect();
  for (const testimonial of testimonials) {
    if (testimonial.downgradeHidden) {
      await ctx.db.patch(testimonial._id, { status: "approved", downgradeHidden: false });
    }
  }
}

// --- AI quota helpers (pure) -------------------------------------------------
// Kept side-effect-free so both the reservation mutation and the usage query
// (convex/ai.ts) share one interpretation of a plan's quota. "combined" plans
// count request + image against one pool; "per_feature" plans meter each
// bucket on its own.

export function aiFeatureLimit(quota: AiQuota, feature: AiFeature): number {
  if (quota.metering === "combined") return quota.combinedGensPerMonth;
  return feature === "request" ? quota.requestGensPerMonth : quota.imageGensPerMonth;
}

export function aiFeatureUsed(
  quota: AiQuota,
  usage: AiUsageCounts,
  feature: AiFeature
): number {
  if (quota.metering === "combined") return usage.requestGenCount + usage.imageGenCount;
  return feature === "request" ? usage.requestGenCount : usage.imageGenCount;
}

export function aiRemaining(quota: AiQuota, usage: AiUsageCounts, feature: AiFeature): number {
  return Math.max(0, aiFeatureLimit(quota, feature) - aiFeatureUsed(quota, usage, feature));
}

// Plan-agnostic monthly totals for summary UIs (the dashboard/plan usage card
// shows one "AI generations X/Y" figure, not the per-feature split). A combined
// plan's total is its shared pool; a per_feature plan's total is both buckets
// added together.
export function aiTotalLimit(quota: AiQuota): number {
  if (quota.metering === "combined") return quota.combinedGensPerMonth;
  return quota.requestGensPerMonth + quota.imageGensPerMonth;
}

export function aiTotalUsed(usage: AiUsageCounts): number {
  return usage.requestGenCount + usage.imageGenCount;
}

// Throws if this feature has no credit left this month. Callers reserve a
// credit before invoking the AI provider, so the cap fails closed.
export function assertUnderAiQuota(
  quota: AiQuota,
  usage: AiUsageCounts,
  feature: AiFeature
): void {
  if (aiRemaining(quota, usage, feature) <= 0) {
    const label = feature === "request" ? "request" : "image";
    throw new Error(
      `You've used all your ${label} generations for this month. Upgrade to Pro for more.`
    );
  }
}
