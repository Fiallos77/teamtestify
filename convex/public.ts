import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getActiveStorageAdapter } from "./lib/storage";

// Everything in this file is reachable by anonymous visitors. Never trust
// client-supplied organizationId/status — always derive them server-side
// from the space document.

export const getSpaceBySlug = query({
  args: { publicSlug: v.string() },
  handler: async (ctx, { publicSlug }) => {
    const space = await ctx.db
      .query("spaces")
      .withIndex("by_slug", (q) => q.eq("publicSlug", publicSlug))
      .unique();
    if (!space || !space.isActive) return null;
    return {
      _id: space._id,
      name: space.name,
      formConfig: space.formConfig,
      branding: space.branding,
      logoUrl: space.branding.logoStorageId
        ? await ctx.storage.getUrl(space.branding.logoStorageId)
        : null,
    };
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await getActiveStorageAdapter().generateUploadUrl(ctx);
  },
});

const submitterFields = {
  spaceId: v.id("spaces"),
  authorName: v.string(),
  authorEmail: v.optional(v.string()),
  authorTitle: v.optional(v.string()),
  authorCompany: v.optional(v.string()),
  authorPhotoStorageId: v.optional(v.id("_storage")),
  rating: v.optional(v.number()),
  answers: v.optional(
    v.array(v.object({ questionId: v.string(), answer: v.string() }))
  ),
  // Honeypot: must stay empty. Real visitors never see/fill this field.
  website: v.optional(v.string()),
};

async function loadActiveSpace(ctx: any, spaceId: any) {
  const space = await ctx.db.get(spaceId);
  if (!space || !space.isActive) {
    throw new Error("This collection page is not accepting submissions");
  }
  return space;
}

export const submitTextTestimonial = mutation({
  args: { ...submitterFields, textContent: v.string() },
  handler: async (ctx, args) => {
    if (args.website) throw new Error("Submission rejected");
    const space = await loadActiveSpace(ctx, args.spaceId);
    if (!space.formConfig.allowText) {
      throw new Error("Text testimonials are not enabled for this space");
    }

    const testimonialId = await ctx.db.insert("testimonials", {
      spaceId: space._id,
      organizationId: space.organizationId,
      type: "text",
      status: "pending",
      authorName: args.authorName,
      authorEmail: args.authorEmail,
      authorTitle: args.authorTitle,
      authorCompany: args.authorCompany,
      authorPhotoStorageId: args.authorPhotoStorageId,
      rating: args.rating,
      textContent: args.textContent,
      answers: args.answers,
      featured: false,
      tags: [],
      source: "form",
      submittedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.notifications.sendNewTestimonialEmail, {
      organizationId: space.organizationId,
      spaceId: space._id,
      testimonialId,
    });
  },
});

export const submitVideoTestimonial = mutation({
  args: {
    ...submitterFields,
    storageId: v.id("_storage"),
    mimeType: v.optional(v.string()),
    durationSeconds: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.website) throw new Error("Submission rejected");
    const space = await loadActiveSpace(ctx, args.spaceId);
    if (!space.formConfig.allowVideo) {
      throw new Error("Video testimonials are not enabled for this space");
    }

    const testimonialId = await ctx.db.insert("testimonials", {
      spaceId: space._id,
      organizationId: space.organizationId,
      type: "video",
      status: "pending",
      authorName: args.authorName,
      authorEmail: args.authorEmail,
      authorTitle: args.authorTitle,
      authorCompany: args.authorCompany,
      authorPhotoStorageId: args.authorPhotoStorageId,
      rating: args.rating,
      answers: args.answers,
      videoStorage: {
        provider: "convex",
        storageId: args.storageId,
        mimeType: args.mimeType,
        durationSeconds: args.durationSeconds,
      },
      featured: false,
      tags: [],
      source: "form",
      submittedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.notifications.sendNewTestimonialEmail, {
      organizationId: space.organizationId,
      spaceId: space._id,
      testimonialId,
    });
  },
});
