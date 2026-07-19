import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  requireOrgContext,
  requireSpaceInOrg,
  requireTestimonialInOrg,
  tryOrgContext,
} from "./lib/authz";
import { getActiveStorageAdapter } from "./lib/storage";
import { assertCanPublish, assertCanPublishVideo } from "./entitlements";

// Org-wide counts for the dashboard summary cards.
export const getOrgStats = query({
  args: {},
  handler: async (ctx) => {
    const orgContext = await tryOrgContext(ctx);
    if (!orgContext) return { pending: 0, approved: 0, videoCount: 0 };

    const all = await ctx.db
      .query("testimonials")
      .withIndex("by_org", (q) => q.eq("organizationId", orgContext.org._id))
      .collect();

    return {
      pending: all.filter((t) => t.status === "pending").length,
      approved: all.filter((t) => t.status === "approved").length,
      videoCount: all.filter((t) => t.type === "video").length,
    };
  },
});

// Per-space counts for the space Overview: total received (any status),
// pending, and approved. Page-safe (zeros before an org is active).
export const getSpaceStats = query({
  args: { spaceId: v.id("spaces") },
  handler: async (ctx, { spaceId }) => {
    const orgContext = await tryOrgContext(ctx);
    if (!orgContext) return { total: 0, pending: 0, approved: 0 };
    await requireSpaceInOrg(ctx, spaceId, orgContext.org._id);
    const all = await ctx.db
      .query("testimonials")
      .withIndex("by_space", (q) => q.eq("spaceId", spaceId))
      .collect();
    return {
      total: all.length,
      pending: all.filter((t) => t.status === "pending").length,
      approved: all.filter((t) => t.status === "approved").length,
    };
  },
});

// Powers the red notification dot on the Inbox tab so a founder working in
// another tab (Settings, Widgets, ...) notices a new submission arrived.
export const getPendingCount = query({
  args: { spaceId: v.id("spaces") },
  handler: async (ctx, { spaceId }) => {
    const orgContext = await tryOrgContext(ctx);
    if (!orgContext) return 0;
    await requireSpaceInOrg(ctx, spaceId, orgContext.org._id);
    const pending = await ctx.db
      .query("testimonials")
      .withIndex("by_space_and_status", (q) => q.eq("spaceId", spaceId).eq("status", "pending"))
      .collect();
    return pending.length;
  },
});

export const listBySpace = query({
  args: {
    spaceId: v.id("spaces"),
    status: v.optional(
      v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))
    ),
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, { spaceId, status, page = 1, limit = 10, sortOrder = "desc" }) => {
    const orgContext = await tryOrgContext(ctx);
    if (!orgContext) return { items: [], total: 0 };
    await requireSpaceInOrg(ctx, spaceId, orgContext.org._id);

    // Convex has no offset cursor, and `total` needs the full count regardless,
    // so we read the space+status range in the requested order and slice the
    // page. Ordering is by _creationTime within the index range: "desc" is
    // newest first.
    const rows = status
      ? await ctx.db
          .query("testimonials")
          .withIndex("by_space_and_status", (q) =>
            q.eq("spaceId", spaceId).eq("status", status)
          )
          .order(sortOrder)
          .collect()
      : await ctx.db
          .query("testimonials")
          .withIndex("by_space", (q) => q.eq("spaceId", spaceId))
          .order(sortOrder)
          .collect();

    const total = rows.length;
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, limit);
    const start = (safePage - 1) * safeLimit;
    const items = rows.slice(start, start + safeLimit);
    return { items, total };
  },
});

export const setStatus = mutation({
  args: {
    testimonialId: v.id("testimonials"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
  },
  handler: async (ctx, { testimonialId, status }) => {
    const { org, identity } = await requireOrgContext(ctx);
    const testimonial = await requireTestimonialInOrg(ctx, testimonialId, org._id);

    // Only gate the transition INTO approved — re-saving an already-approved
    // testimonial (or rejecting one) must never be blocked by entitlements,
    // otherwise it'd double-count itself against its own limit.
    if (status === "approved" && testimonial.status !== "approved") {
      await assertCanPublish(ctx, org._id);
      if (testimonial.type === "video") {
        await assertCanPublishVideo(ctx, org._id);
      }
    }

    await ctx.db.patch(testimonialId, {
      status,
      reviewedAt: Date.now(),
      reviewedBy: identity.subject,
    });
  },
});

export const setFeatured = mutation({
  args: { testimonialId: v.id("testimonials"), featured: v.boolean() },
  handler: async (ctx, { testimonialId, featured }) => {
    const { org } = await requireOrgContext(ctx);
    await requireTestimonialInOrg(ctx, testimonialId, org._id);
    await ctx.db.patch(testimonialId, { featured });
  },
});

export const setTags = mutation({
  args: { testimonialId: v.id("testimonials"), tags: v.array(v.string()) },
  handler: async (ctx, { testimonialId, tags }) => {
    const { org } = await requireOrgContext(ctx);
    await requireTestimonialInOrg(ctx, testimonialId, org._id);
    await ctx.db.patch(testimonialId, { tags });
  },
});

export const setDisplayOrder = mutation({
  args: { testimonialId: v.id("testimonials"), displayOrder: v.number() },
  handler: async (ctx, { testimonialId, displayOrder }) => {
    const { org } = await requireOrgContext(ctx);
    await requireTestimonialInOrg(ctx, testimonialId, org._id);
    await ctx.db.patch(testimonialId, { displayOrder });
  },
});

export const remove = mutation({
  args: { testimonialId: v.id("testimonials") },
  handler: async (ctx, { testimonialId }) => {
    const { org } = await requireOrgContext(ctx);
    const testimonial = await requireTestimonialInOrg(ctx, testimonialId, org._id);
    if (testimonial.videoStorage) {
      await getActiveStorageAdapter().delete(ctx, testimonial.videoStorage);
    }
    await ctx.db.delete(testimonialId);
  },
});

export const getVideoUrl = query({
  args: { testimonialId: v.id("testimonials") },
  handler: async (ctx, { testimonialId }) => {
    const orgContext = await tryOrgContext(ctx);
    if (!orgContext) return null;
    const testimonial = await requireTestimonialInOrg(ctx, testimonialId, orgContext.org._id);
    if (!testimonial.videoStorage) return null;
    return await getActiveStorageAdapter().getServingUrl(
      ctx,
      testimonial.videoStorage
    );
  },
});
