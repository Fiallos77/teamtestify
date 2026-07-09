import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  requireOrgContext,
  requireSpaceInOrg,
  requireTestimonialInOrg,
  tryOrgContext,
} from "./lib/authz";
import { getActiveStorageAdapter } from "./lib/storage";

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
  },
  handler: async (ctx, { spaceId, status }) => {
    const orgContext = await tryOrgContext(ctx);
    if (!orgContext) return [];
    await requireSpaceInOrg(ctx, spaceId, orgContext.org._id);

    if (status) {
      return await ctx.db
        .query("testimonials")
        .withIndex("by_space_and_status", (q) =>
          q.eq("spaceId", spaceId).eq("status", status)
        )
        .collect();
    }
    return await ctx.db
      .query("testimonials")
      .withIndex("by_space", (q) => q.eq("spaceId", spaceId))
      .collect();
  },
});

export const setStatus = mutation({
  args: {
    testimonialId: v.id("testimonials"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
  },
  handler: async (ctx, { testimonialId, status }) => {
    const { org, identity } = await requireOrgContext(ctx);
    await requireTestimonialInOrg(ctx, testimonialId, org._id);
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
