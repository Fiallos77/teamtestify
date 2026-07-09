import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

type Ctx = QueryCtx | MutationCtx;

export class AuthzError extends Error {}

/**
 * Organizations/membership are entirely our own tables (`organizations`,
 * `organizationMembers`, `userSettings`) — Better Auth is only used for
 * identity (who is this user), not multi-tenancy. `identity.subject` is the
 * Better Auth user id, used as the join key into `organizationMembers`.
 * The "active" organization is whichever one is recorded in `userSettings`
 * for that user (set by the org switcher / create-org flow).
 */
export async function requireOrgContext(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new AuthzError("Unauthenticated");

  const settings = await ctx.db
    .query("userSettings")
    .withIndex("by_auth_user_id", (q) => q.eq("authUserId", identity.subject))
    .unique();
  const activeOrganizationId = settings?.activeOrganizationId;
  if (!activeOrganizationId) {
    throw new AuthzError("No active organization selected");
  }

  const membership = await ctx.db
    .query("organizationMembers")
    .withIndex("by_org_and_user", (q) =>
      q.eq("organizationId", activeOrganizationId).eq("authUserId", identity.subject)
    )
    .unique();
  if (!membership) throw new AuthzError("No active organization selected");

  const org = await ctx.db.get(activeOrganizationId);
  if (!org) throw new AuthzError("Organization not found");

  return { identity, org, orgRole: membership.role };
}

/**
 * Same as requireOrgContext, but resolves to null instead of throwing when
 * unauthenticated or no organization is active yet. Use this in read-only
 * queries that pages call directly on mount, so that race lands as an
 * empty/loading UI state rather than an uncaught error. Mutations should
 * keep using requireOrgContext — there's no safe default to fall back to
 * when a write is actually attempted.
 */
export async function tryOrgContext(ctx: Ctx) {
  try {
    return await requireOrgContext(ctx);
  } catch (e) {
    if (e instanceof AuthzError) return null;
    throw e;
  }
}

export async function requireSpaceInOrg(
  ctx: Ctx,
  spaceId: Id<"spaces">,
  organizationId: Id<"organizations">
) {
  const space = await ctx.db.get(spaceId);
  if (!space || space.organizationId !== organizationId) {
    throw new AuthzError("Space not found in this organization");
  }
  return space;
}

export async function requireTestimonialInOrg(
  ctx: Ctx,
  testimonialId: Id<"testimonials">,
  organizationId: Id<"organizations">
) {
  const testimonial = await ctx.db.get(testimonialId);
  if (!testimonial || testimonial.organizationId !== organizationId) {
    throw new AuthzError("Testimonial not found in this organization");
  }
  return testimonial;
}

export async function requireWidgetInOrg(
  ctx: Ctx,
  widgetId: Id<"widgets">,
  organizationId: Id<"organizations">
) {
  const widget = await ctx.db.get(widgetId);
  if (!widget || widget.organizationId !== organizationId) {
    throw new AuthzError("Widget not found in this organization");
  }
  return widget;
}
