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
