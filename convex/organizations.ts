import { v } from "convex/values";
import { internalQuery, mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { AuthzError, requireOrgContext } from "./lib/authz";

async function requireIdentity(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new AuthzError("Unauthenticated");
  return identity;
}

async function setActiveOrgForUser(
  ctx: MutationCtx,
  authUserId: string,
  organizationId: Id<"organizations">
) {
  const settings = await ctx.db
    .query("userSettings")
    .withIndex("by_auth_user_id", (q) => q.eq("authUserId", authUserId))
    .unique();
  if (settings) {
    await ctx.db.patch(settings._id, { activeOrganizationId: organizationId });
  } else {
    await ctx.db.insert("userSettings", {
      authUserId,
      activeOrganizationId: organizationId,
    });
  }
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("authUserId", identity.subject))
      .collect();
    const orgs = await Promise.all(
      memberships.map((m) => ctx.db.get(m.organizationId))
    );
    return orgs.filter((o): o is NonNullable<typeof o> => o !== null);
  },
});

export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_auth_user_id", (q) => q.eq("authUserId", identity.subject))
      .unique();
    if (!settings?.activeOrganizationId) return null;
    return await ctx.db.get(settings.activeOrganizationId);
  },
});

export const create = mutation({
  args: { name: v.string(), slug: v.optional(v.string()) },
  handler: async (ctx, { name, slug }) => {
    const identity = await requireIdentity(ctx);
    const organizationId = await ctx.db.insert("organizations", {
      name,
      slug,
      createdAt: Date.now(),
    });
    await ctx.db.insert("organizationMembers", {
      organizationId,
      authUserId: identity.subject,
      role: "owner",
      createdAt: Date.now(),
    });
    await setActiveOrgForUser(ctx, identity.subject, organizationId);
    return organizationId;
  },
});

export const setActive = mutation({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    const identity = await requireIdentity(ctx);
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_and_user", (q) =>
        q.eq("organizationId", organizationId).eq("authUserId", identity.subject)
      )
      .unique();
    if (!membership) throw new AuthzError("Not a member of this organization");
    await setActiveOrgForUser(ctx, identity.subject, organizationId);
  },
});

export const updateNotificationEmail = mutation({
  args: { notificationEmail: v.optional(v.string()) },
  handler: async (ctx, { notificationEmail }) => {
    const { org } = await requireOrgContext(ctx);
    await ctx.db.patch(org._id, { notificationEmail });
  },
});

// Rename the active organization (Profile tab). Members of the org may edit it,
// mirroring updateNotificationEmail's access model. A blank name is rejected so
// the org can't lose its display label.
export const updateName = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const { org } = await requireOrgContext(ctx);
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Organization name cannot be empty");
    await ctx.db.patch(org._id, { name: trimmed });
  },
});

// Used by convex/stripe.ts (a "use node" action file — actions can't touch
// ctx.db directly). Billing actions (checkout, portal) are owner-only:
// any member could otherwise self-serve upgrade/manage billing for an org
// they don't own.
export const requireOwnerContext = internalQuery({
  args: {},
  handler: async (ctx) => {
    const { org, orgRole } = await requireOrgContext(ctx);
    if (orgRole !== "owner") {
      throw new AuthzError("Only the organization owner can manage billing");
    }
    return { organizationId: org._id };
  },
});

// Used by convex/notifications.ts (a "use node" action file — actions can't
// touch ctx.db directly, so this query hands over just what the email needs).
export const getNotificationContext = internalQuery({
  args: { organizationId: v.id("organizations"), spaceId: v.id("spaces") },
  handler: async (ctx, { organizationId, spaceId }) => {
    const org = await ctx.db.get(organizationId);
    const space = await ctx.db.get(spaceId);
    return {
      notificationEmail: org?.notificationEmail,
      spaceName: space?.name ?? "your space",
    };
  },
});
