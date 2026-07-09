"use client";

import { TestimonialCard } from "./testimonial-card";
import type { EmbedStyle, EmbedTestimonial } from "./types";

export function TestimonialGrid({
  testimonials,
  style,
  onCardClick,
}: {
  testimonials: EmbedTestimonial[];
  style: EmbedStyle;
  onCardClick?: (testimonialId: string) => void;
}) {
  const columns = style.columns ?? 3;
  const colsClass =
    columns >= 4
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      : columns === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  return (
    <div className={`grid gap-4 ${colsClass}`}>
      {testimonials.map((t) => (
        <TestimonialCard
          key={t.id}
          testimonial={t}
          style={style}
          fixedSize
          onClick={onCardClick ? () => onCardClick(t.id) : undefined}
        />
      ))}
    </div>
  );
}
