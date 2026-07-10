import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

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
export const PRO_AI_GENERATIONS_PER_MONTH = 100;

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
  aiGenerationsPerMonth: number;
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
  aiGenerationsPerMonth: 0,
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
  aiGenerationsPerMonth: PRO_AI_GENERATIONS_PER_MONTH,
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

async function countApprovedTestimonials(ctx: Ctx, organizationId: Id<"organizations">) {
  const testimonials = await ctx.db
    .query("testimonials")
    .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
    .collect();
  return testimonials.filter((t) => t.status === "approved");
}

export async function assertCanPublish(ctx: Ctx, organizationId: Id<"organizations">) {
  const entitlements = await getEntitlements(ctx, organizationId);
  if (entitlements.maxPublishedTestimonials === null) return;
  const approved = await countApprovedTestimonials(ctx, organizationId);
  if (approved.length >= entitlements.maxPublishedTestimonials) {
    throw new Error(
      `Your plan allows up to ${entitlements.maxPublishedTestimonials} published testimonials. Upgrade to Pro for unlimited.`
    );
  }
}

export async function assertCanPublishVideo(ctx: Ctx, organizationId: Id<"organizations">) {
  const entitlements = await getEntitlements(ctx, organizationId);
  if (entitlements.maxPublishedVideoTestimonials === null) return;
  const approved = await countApprovedTestimonials(ctx, organizationId);
  const approvedVideos = approved.filter((t) => t.type === "video");
  if (approvedVideos.length >= entitlements.maxPublishedVideoTestimonials) {
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
