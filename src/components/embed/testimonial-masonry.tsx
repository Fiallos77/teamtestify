"use client";

import { TestimonialCard } from "./testimonial-card";
import type { EmbedStyle, EmbedTestimonial } from "./types";

export function TestimonialMasonry({
  testimonials,
  style,
  onCardClick,
}: {
  testimonials: EmbedTestimonial[];
  style: EmbedStyle;
  onCardClick?: (testimonialId: string) => void;
}) {
  const columns = Math.min(style.columns ?? 3, testimonials.length) || 1;
  const colsClass =
    columns >= 4
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      : columns === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : columns === 1
          ? "grid-cols-1"
          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  // CSS multi-column's `column-fill: balance` can silently use fewer columns
  // than requested when there isn't much content, and `auto` fill collapses
  // to one column without an explicit container height — so the staggered
  // effect is built by hand instead: distribute testimonials round-robin
  // across N flex columns, each one free to grow to its own content height.
  const buckets: EmbedTestimonial[][] = Array.from({ length: columns }, () => []);
  testimonials.forEach((t, i) => buckets[i % columns].push(t));

  return (
    <div className={`grid gap-4 ${colsClass}`}>
      {buckets.map((bucket, i) => (
        <div key={i} className="flex flex-col gap-4">
          {bucket.map((t) => (
            <TestimonialCard
              key={t.id}
              testimonial={t}
              style={style}
              onClick={onCardClick ? () => onCardClick(t.id) : undefined}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
