import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  requireOrgContext,
  requireSpaceInOrg,
  requireTestimonialInOrg,
  requireWidgetInOrg,
  tryOrgContext,
} from "./lib/authz";
import { matchesFilter, toPayloadTestimonial } from "./lib/widgetPayload";

const filterValidator = v.object({
  includeTags: v.optional(v.array(v.string())),
  onlyFeatured: v.optional(v.boolean()),
  minRating: v.optional(v.number()),
  maxItems: v.optional(v.number()),
});

const styleValidator = v.object({
  theme: v.union(v.literal("light"), v.literal("dark"), v.literal("auto")),
  accentColor: v.optional(v.string()),
  backgroundColor: v.optional(v.string()),
  layout: v.union(
    v.literal("grid"),
    v.literal("masonry"),
    v.literal("masonry-animated"),
    v.literal("carousel")
  ),
  columns: v.optional(v.number()),
  rows: v.optional(v.number()),
  showRating: v.boolean(),
  showAvatar: v.boolean(),
  showDate: v.optional(v.boolean()),
  autoplaySeconds: v.optional(v.number()),
  maxHeight: v.optional(v.number()),
  scrollDirection: v.optional(v.union(v.literal("vertical"), v.literal("horizontal"))),
  scrollSpeed: v.optional(
    v.union(v.literal("slow"), v.literal("normal"), v.literal("fast"))
  ),
  reverseDirection: v.optional(v.boolean()),
  showHeartAnimation: v.optional(v.boolean()),
});

export const getById = query({
  args: { widgetId: v.id("widgets") },
  handler: async (ctx, { widgetId }) => {
    const orgContext = await tryOrgContext(ctx);
    if (!orgContext) return null;
    return await requireWidgetInOrg(ctx, widgetId, orgContext.org._id);
  },
});

export const listBySpace = query({
  args: { spaceId: v.id("spaces") },
  handler: async (ctx, { spaceId }) => {
    const orgContext = await tryOrgContext(ctx);
    if (!orgContext) return [];
    await requireSpaceInOrg(ctx, spaceId, orgContext.org._id);
    return await ctx.db
      .query("widgets")
      .withIndex("by_space", (q) => q.eq("spaceId", spaceId))
      .collect();
  },
});

// Powers the live preview in the widget creation flow (and can be reused by
// the editor). Mirrors buildWidgetPayload's testimonial-selection logic
// (widgetPayload.ts) but from in-progress, not-yet-saved type/filter values —
// no widget row needs to exist yet, and it isn't gated on isPublished like the
// public embed payload is, since this is an authenticated preview for the
// space's own owner.
export const getPreviewPayload = query({
  args: {
    spaceId: v.id("spaces"),
    type: v.union(v.literal("wall"), v.literal("single")),
    singleTestimonialId: v.optional(v.id("testimonials")),
    filter: filterValidator,
  },
  handler: async (ctx, { spaceId, type, singleTestimonialId, filter }) => {
    const orgContext = await tryOrgContext(ctx);
    if (!orgContext) return { type, testimonials: [] };
    await requireSpaceInOrg(ctx, spaceId, orgContext.org._id);

    if (type === "single") {
      if (!singleTestimonialId) return { type, testimonials: [] };
      const testimonial = await ctx.db.get(singleTestimonialId);
      if (
        !testimonial ||
        testimonial.spaceId !== spaceId ||
        testimonial.status !== "approved"
      ) {
        return { type, testimonials: [] };
      }
      return { type, testimonials: [await toPayloadTestimonial(ctx, testimonial)] };
    }

    const approved = await ctx.db
      .query("testimonials")
      .withIndex("by_space_and_status", (q) =>
        q.eq("spaceId", spaceId).eq("status", "approved")
      )
      .collect();
    const filtered = approved
      .filter((t) => matchesFilter(t, filter))
      .sort((a, b) => (a.displayOrder ?? a.submittedAt) - (b.displayOrder ?? b.submittedAt))
      .slice(0, filter.maxItems ?? 50);
    const testimonials = await Promise.all(filtered.map((t) => toPayloadTestimonial(ctx, t)));
    return { type, testimonials };
  },
});

export const create = mutation({
  args: {
    spaceId: v.id("spaces"),
    type: v.union(v.literal("wall"), v.literal("single")),
    name: v.string(),
    singleTestimonialId: v.optional(v.id("testimonials")),
    filter: filterValidator,
    style: styleValidator,
  },
  handler: async (ctx, args) => {
    const { org } = await requireOrgContext(ctx);
    await requireSpaceInOrg(ctx, args.spaceId, org._id);
    if (args.singleTestimonialId) {
      await requireTestimonialInOrg(ctx, args.singleTestimonialId, org._id);
    }
    return await ctx.db.insert("widgets", {
      organizationId: org._id,
      spaceId: args.spaceId,
      type: args.type,
      name: args.name,
      singleTestimonialId: args.singleTestimonialId,
      filter: args.filter,
      style: args.style,
      isPublished: false,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    widgetId: v.id("widgets"),
    name: v.optional(v.string()),
    type: v.optional(v.union(v.literal("wall"), v.literal("single"))),
    singleTestimonialId: v.optional(v.id("testimonials")),
    filter: v.optional(filterValidator),
    style: v.optional(styleValidator),
    isPublished: v.optional(v.boolean()),
  },
  handler: async (ctx, { widgetId, ...patch }) => {
    const { org } = await requireOrgContext(ctx);
    await requireWidgetInOrg(ctx, widgetId, org._id);
    if (patch.singleTestimonialId) {
      await requireTestimonialInOrg(ctx, patch.singleTestimonialId, org._id);
    }
    await ctx.db.patch(widgetId, patch);
  },
});

export const remove = mutation({
  args: { widgetId: v.id("widgets") },
  handler: async (ctx, { widgetId }) => {
    const { org } = await requireOrgContext(ctx);
    await requireWidgetInOrg(ctx, widgetId, org._id);
    await ctx.db.delete(widgetId);
  },
});
