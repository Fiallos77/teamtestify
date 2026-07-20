"use client";

import { Heart, Quote } from "lucide-react";

// Top-of-page entry point for widget creation — existing types only. Plain
// buttons (no nested interactive preview inside), so no HTML-nesting concern
// like the layout preset cards have.
export function WidgetTypeSelector({
  onSelect,
}: {
  onSelect: (type: "wall" | "single") => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => onSelect("wall")}
        className="flex flex-col items-start gap-2 rounded-xl border p-5 text-left transition-colors hover:border-primary hover:bg-accent"
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Heart className="size-5" />
        </span>
        <p className="font-medium">Wall of Love</p>
        <p className="text-sm text-muted-foreground">
          A masonry or carousel grid of testimonials for a dedicated page.
        </p>
      </button>

      <button
        type="button"
        onClick={() => onSelect("single")}
        className="flex flex-col items-start gap-2 rounded-xl border p-5 text-left transition-colors hover:border-primary hover:bg-accent"
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Quote className="size-5" />
        </span>
        <p className="font-medium">Single testimonial</p>
        <p className="text-sm text-muted-foreground">
          Embed one testimonial anywhere — as a video or a text quote.
        </p>
      </button>
    </div>
  );
}
