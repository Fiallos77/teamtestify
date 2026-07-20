import type { QueryCtx } from "../_generated/server";
import type { Id, Doc } from "../_generated/dataModel";
import { getActiveStorageAdapter } from "./storage";

export function matchesFilter(t: Doc<"testimonials">, filter: Doc<"widgets">["filter"]) {
  if (filter.onlyFeatured && !t.featured) return false;
  if (filter.minRating && (t.rating ?? 0) < filter.minRating) return false;
  if (filter.includeTags && filter.includeTags.length > 0) {
    const hasTag = filter.includeTags.some((tag) => t.tags.includes(tag));
    if (!hasTag) return false;
  }
  return true;
}

export async function toPayloadTestimonial(ctx: QueryCtx, t: Doc<"testimonials">) {
  const storage = getActiveStorageAdapter();
  return {
    id: t._id,
    type: t.type,
    authorName: t.authorName,
    authorTitle: t.authorTitle,
    authorCompany: t.authorCompany,
    authorPhotoUrl: t.authorPhotoStorageId
      ? await ctx.storage.getUrl(t.authorPhotoStorageId)
      : null,
    rating: t.rating,
    textContent: t.textContent,
    videoUrl: t.videoStorage ? await storage.getServingUrl(ctx, t.videoStorage) : null,
    submittedAt: t.submittedAt,
  };
}

// The wall-widget testimonial pipeline shared by buildWidgetPayload (the
// published, public embed) and widgets.getPreviewPayload (the owner-facing
// live preview while still editing filter/style) — same select → filter →
// order → cap → resolve-to-payload sequence for both, so they can never
// silently drift apart on what a given filter actually shows.
export async function selectWidgetTestimonials(
  ctx: QueryCtx,
  spaceId: Id<"spaces">,
  filter: Doc<"widgets">["filter"]
) {
  const approved = await ctx.db
    .query("testimonials")
    .withIndex("by_space_and_status", (q) => q.eq("spaceId", spaceId).eq("status", "approved"))
    .collect();

  const filtered = approved
    .filter((t) => matchesFilter(t, filter))
    .sort((a, b) => (a.displayOrder ?? a.submittedAt) - (b.displayOrder ?? b.submittedAt))
    .slice(0, filter.maxItems ?? 50);

  return await Promise.all(filtered.map((t) => toPayloadTestimonial(ctx, t)));
}

export async function buildWidgetPayload(ctx: QueryCtx, widgetId: Id<"widgets">) {
  const widget = await ctx.db.get(widgetId).catch(() => null);
  if (!widget || !widget.isPublished) return null;

  if (widget.type === "single") {
    if (!widget.singleTestimonialId) {
      return { type: widget.type, name: widget.name, style: widget.style, testimonials: [] };
    }
    const testimonial = await ctx.db.get(widget.singleTestimonialId);
    if (!testimonial || testimonial.status !== "approved") {
      return { type: widget.type, name: widget.name, style: widget.style, testimonials: [] };
    }
    return {
      type: widget.type,
      name: widget.name,
      style: widget.style,
      testimonials: [await toPayloadTestimonial(ctx, testimonial)],
    };
  }

  const testimonials = await selectWidgetTestimonials(ctx, widget.spaceId, widget.filter);
  return { type: widget.type, name: widget.name, style: widget.style, testimonials };
}
