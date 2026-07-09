"use client";

import { Star } from "lucide-react";
import type { EmbedStyle, EmbedTestimonial } from "./types";

export function SingleTestimonial({
  testimonial,
  style,
}: {
  testimonial: EmbedTestimonial;
  style: EmbedStyle;
}) {
  const meta = [testimonial.authorTitle, testimonial.authorCompany]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
      {style.showRating && testimonial.rating ? (
        <div className="flex gap-1 text-primary">
          {Array.from({ length: testimonial.rating }).map((_, i) => (
            <Star key={i} className="size-5 fill-current" />
          ))}
        </div>
      ) : null}
      {testimonial.type === "video" && testimonial.videoUrl ? (
        <video src={testimonial.videoUrl} controls className="w-full rounded-xl" />
      ) : (
        <p className="text-xl leading-relaxed font-medium">
          “{testimonial.textContent}”
        </p>
      )}
      <div className="flex items-center gap-3">
        {style.showAvatar && testimonial.authorPhotoUrl && (
          <img
            src={testimonial.authorPhotoUrl}
            alt=""
            className="size-12 shrink-0 rounded-full bg-muted object-cover"
          />
        )}
        <div className="text-left">
          <div className="font-semibold">{testimonial.authorName}</div>
          {meta && <div className="text-sm text-muted-foreground">{meta}</div>}
        </div>
      </div>
      {style.showDate !== false && (
        <div className="text-xs text-muted-foreground">
          {new Date(testimonial.submittedAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </div>
      )}
    </div>
  );
}
