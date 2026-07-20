"use client";

import { Heart, Quote } from "lucide-react";
import { cn } from "@/lib/utils";

const CARD_CLASS =
  "flex flex-col items-start gap-2 rounded-xl border p-5 text-left transition-colors hover:border-primary hover:bg-accent";
const CARD_SELECTED_CLASS = "border-primary bg-accent ring-2 ring-primary/20";

// Top-of-page entry point for widget creation — existing types only. Stays
// mounted (and shows which type is active) even once a flow is underway, so
// the flow expands below it rather than replacing it.
export function WidgetTypeSelector({
  selected,
  onSelect,
}: {
  selected: "wall" | "single" | null;
  onSelect: (type: "wall" | "single") => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <button
        type="button"
        aria-pressed={selected === "wall"}
        onClick={() => onSelect("wall")}
        className={cn(CARD_CLASS, selected === "wall" && CARD_SELECTED_CLASS)}
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
        aria-pressed={selected === "single"}
        onClick={() => onSelect("single")}
        className={cn(CARD_CLASS, selected === "single" && CARD_SELECTED_CLASS)}
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
