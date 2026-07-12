import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireOrgContext, requireSpaceInOrg, tryOrgContext } from "./lib/authz";
import { getActiveStorageAdapter } from "./lib/storage";
import { assertCanCreateSpace } from "./entitlements";

const formConfigValidator = v.object({
  headline: v.string(),
  subheading: v.optional(v.string()),
  questions: v.array(
    v.object({ id: v.string(), label: v.string(), required: v.boolean() })
  ),
  collectRating: v.boolean(),
  collectNameCompanyPhoto: v.boolean(),
  collectAuthorEmail: v.optional(v.boolean()),
  thankYouMessage: v.optional(v.string()),
  allowText: v.boolean(),
  allowVideo: v.boolean(),
});

const brandingValidator = v.object({
  primaryColor: v.optional(v.string()),
  logoStorageId: v.optional(v.id("_storage")),
  backgroundStyle: v.optional(v.string()),
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const orgContext = await tryOrgContext(ctx);
    if (!orgContext) return [];
    return await ctx.db
      .query("spaces")
      .withIndex("by_org", (q) => q.eq("organizationId", orgContext.org._id))
      .collect();
  },
});

export const get = query({
  args: { spaceId: v.id("spaces") },
  handler: async (ctx, { spaceId }) => {
    const orgContext = await tryOrgContext(ctx);
    if (!orgContext) return null;
    return await requireSpaceInOrg(ctx, spaceId, orgContext.org._id);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    publicSlug: v.string(),
    formConfig: formConfigValidator,
    branding: brandingValidator,
  },
  handler: async (ctx, args) => {
    const { org } = await requireOrgContext(ctx);
    await assertCanCreateSpace(ctx, org._id);

    const existing = await ctx.db
      .query("spaces")
      .withIndex("by_slug", (q) => q.eq("publicSlug", args.publicSlug))
      .unique();
    if (existing) throw new Error("That public URL slug is already taken");

    return await ctx.db.insert("spaces", {
      organizationId: org._id,
      name: args.name,
      description: args.description,
      publicSlug: args.publicSlug,
      formConfig: args.formConfig,
      branding: args.branding,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    spaceId: v.id("spaces"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    formConfig: v.optional(formConfigValidator),
    branding: v.optional(brandingValidator),
    isActive: v.optional(v.boolean()),
    businessDescription: v.optional(v.string()),
    imageHeaderLabel: v.optional(v.string()),
    imageFooterText: v.optional(v.string()),
  },
  handler: async (ctx, { spaceId, ...patch }) => {
    const { org } = await requireOrgContext(ctx);
    await requireSpaceInOrg(ctx, spaceId, org._id);
    await ctx.db.patch(spaceId, patch);
  },
});

export const remove = mutation({
  args: { spaceId: v.id("spaces") },
  handler: async (ctx, { spaceId }) => {
    const { org } = await requireOrgContext(ctx);
    const space = await requireSpaceInOrg(ctx, spaceId, org._id);

    const storage = getActiveStorageAdapter();

    const testimonials = await ctx.db
      .query("testimonials")
      .withIndex("by_space", (q) => q.eq("spaceId", spaceId))
      .collect();
    for (const testimonial of testimonials) {
      if (testimonial.videoStorage) {
        await storage.delete(ctx, testimonial.videoStorage);
      }
      await ctx.db.delete(testimonial._id);
    }

    const widgets = await ctx.db
      .query("widgets")
      .withIndex("by_space", (q) => q.eq("spaceId", spaceId))
      .collect();
    for (const widget of widgets) {
      const events = await ctx.db
        .query("widgetEvents")
        .withIndex("by_widget_and_time", (q) => q.eq("widgetId", widget._id))
        .collect();
      for (const event of events) {
        await ctx.db.delete(event._id);
      }
      await ctx.db.delete(widget._id);
    }

    if (space.branding.logoStorageId) {
      await ctx.storage.delete(space.branding.logoStorageId);
    }

    await ctx.db.delete(spaceId);
  },
});

// Authenticated counterpart to public.generateUploadUrl — used for the
// space's own logo upload from the dashboard, not anonymous visitor uploads.
export const generateLogoUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireOrgContext(ctx);
    return await getActiveStorageAdapter().generateUploadUrl(ctx);
  },
});

export const getLogoUrl = query({
  args: { logoStorageId: v.id("_storage") },
  handler: async (ctx, { logoStorageId }) => {
    return await ctx.storage.getUrl(logoStorageId);
  },
});
