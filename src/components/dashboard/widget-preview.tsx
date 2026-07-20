"use client";

import { TestimonialGrid } from "@/components/embed/testimonial-grid";
import { TestimonialMasonry } from "@/components/embed/testimonial-masonry";
import { TestimonialMasonryAnimated } from "@/components/embed/testimonial-masonry-animated";
import { TestimonialCarousel } from "@/components/embed/testimonial-carousel";
import { SingleTestimonial } from "@/components/embed/single-testimonial";
import type { EmbedStyle, EmbedTestimonial } from "@/components/embed/types";

// Live preview for the widget creation flow's customize step. Renders with
// the exact same presentational components the public /embed/[widgetId] page
// uses (so the preview never drifts from the real thing), fed by
// widgets.getPreviewPayload against the in-progress (not yet saved)
// type/style/filter — no need to publish, or even save, to see it update.
//
// Unlike the public embed page this doesn't do OS dark-mode detection or
// iframe-resize messaging (there's no iframe — it renders inline in the
// dashboard); "auto" theme just renders light here, matching what most
// visitors in light mode will see.
export function WidgetPreview({
  type,
  style,
  testimonials,
}: {
  type: "wall" | "single";
  style: EmbedStyle;
  testimonials: EmbedTestimonial[];
}) {
  const isDark = style.theme === "dark";

  const content =
    testimonials.length === 0 ? (
      <div className="p-6 text-center text-sm text-muted-foreground">
        No testimonials to show yet.
      </div>
    ) : type === "single" ? (
      <SingleTestimonial testimonial={testimonials[0]} style={style} />
    ) : style.layout === "masonry" ? (
      <TestimonialMasonry testimonials={testimonials} style={style} />
    ) : style.layout === "masonry-animated" ? (
      <TestimonialMasonryAnimated testimonials={testimonials} style={style} />
    ) : style.layout === "carousel" ? (
      <TestimonialCarousel testimonials={testimonials} style={style} />
    ) : (
      <TestimonialGrid testimonials={testimonials} style={style} />
    );

  const isScrollable =
    type === "wall" &&
    style.layout !== "carousel" &&
    style.layout !== "masonry-animated" &&
    style.maxHeight;

  const accentStyle = style.accentColor
    ? ({ "--primary": style.accentColor } as React.CSSProperties)
    : undefined;
  const containerStyle: React.CSSProperties = {
    ...(style.backgroundColor ? { backgroundColor: style.backgroundColor } : {}),
  };

  return (
    <div className={isDark ? "dark" : ""} style={accentStyle}>
      <div className="rounded-xl border bg-background p-4 text-foreground" style={containerStyle}>
        {isScrollable ? (
          <div style={{ maxHeight: style.maxHeight, overflowY: "auto" }} className="pr-1">
            {content}
          </div>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
