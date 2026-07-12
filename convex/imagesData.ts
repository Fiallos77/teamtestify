import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { requireOrgContext, requireTestimonialInOrg } from "./lib/authz";
import { getActiveStorageAdapter } from "./lib/storage";
import { getEntitlements } from "./entitlements";

// Default-runtime query the (use node) generateImageProposal action calls to
// authorize + gather everything it needs: the testimonial must belong to the
// caller's active org (requireTestimonialInOrg), and we resolve serving URLs +
// the brand color + the plan's watermark flag here where ctx.db/ctx.storage
// live. Kept out of images.ts because that file is "use node".
export const getImageProposalContext = internalQuery({
  args: { testimonialId: v.id("testimonials") },
  handler: async (ctx, { testimonialId }) => {
    const { org } = await requireOrgContext(ctx);
    const testimonial = await requireTestimonialInOrg(ctx, testimonialId, org._id);
    const space = await ctx.db.get(testimonial.spaceId);
    const entitlements = await getEntitlements(ctx, org._id);

    const storage = getActiveStorageAdapter();
    const videoUrl = testimonial.videoStorage
      ? await storage.getServingUrl(ctx, testimonial.videoStorage)
      : null;
    const photoUrl = testimonial.authorPhotoStorageId
      ? await ctx.storage.getUrl(testimonial.authorPhotoStorageId)
      : null;

    return {
      organizationId: org._id,
      type: testimonial.type,
      textContent: testimonial.textContent ?? "",
      videoUrl,
      photoUrl,
      authorName: testimonial.authorName,
      authorTitle: testimonial.authorTitle,
      authorCompany: testimonial.authorCompany,
      rating: testimonial.rating,
      primaryColor: space?.branding.primaryColor ?? "#4f46e5",
      watermark: entitlements.aiQuota.watermark,
      // owner overrides (undefined -> the action uses the AI's default / no footer)
      headerLabelOverride: space?.imageHeaderLabel,
      footer: space?.imageFooterText,
      previousLayouts: org.lastImageLayouts ?? [],
    };
  },
});

// Records which 3 layouts a generation used, so the next one can avoid the
// exact same set. Called by the (use node) action after a successful proposal.
export const recordImageGeneration = internalMutation({
  args: { organizationId: v.id("organizations"), layouts: v.array(v.string()) },
  handler: async (ctx, { organizationId, layouts }) => {
    await ctx.db.patch(organizationId, { lastImageLayouts: layouts });
  },
});
