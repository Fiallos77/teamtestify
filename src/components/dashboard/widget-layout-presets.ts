import type { EmbedTestimonial } from "@/components/embed/types";
import { defaultAppearanceState, type WidgetAppearanceState } from "./widget-appearance";

// Step 1 of the Wall of Love flow: pick a layout, not a whole style bundle —
// each preset differs only in the layout field (plus whatever that layout
// needs to look sensible, e.g. carousel's autoplay), everything else stays
// at the shared default so the choice reads as "how should this scroll",
// not "what colors do you want" (that's step 2).
export interface WidgetLayoutPreset {
  id: "masonry-animated" | "masonry" | "carousel";
  layout: "masonry-animated" | "masonry" | "carousel";
  label: string;
  description: string;
  appearance: WidgetAppearanceState;
}

export const WALL_LAYOUT_PRESETS: WidgetLayoutPreset[] = [
  {
    id: "masonry-animated",
    layout: "masonry-animated",
    label: "Masonry animated",
    description: "A scrolling ticker of testimonials — eye-catching and always moving.",
    appearance: { ...defaultAppearanceState("wall"), layout: "masonry-animated" },
  },
  {
    id: "masonry",
    layout: "masonry",
    label: "Masonry fixed",
    description: "Staggered columns that fill the page like a mood board.",
    appearance: { ...defaultAppearanceState("wall"), layout: "masonry" },
  },
  {
    id: "carousel",
    layout: "carousel",
    label: "Carousel",
    description: "One testimonial at a time — compact, great for a hero section.",
    appearance: {
      ...defaultAppearanceState("wall"),
      layout: "carousel",
      autoplaySeconds: 5,
      limitHeight: false,
      maxHeight: "",
    },
  },
];

// Realistic sample content for the layout cards' live previews — not
// "Lorem ipsum" placeholder text. Fixed timestamps keep this deterministic.
const WALL_SAMPLE_TESTIMONIALS: EmbedTestimonial[] = [
  {
    id: "sample-1",
    type: "text",
    authorName: "Jordan Lee",
    authorTitle: "Head of Growth",
    authorCompany: "Northwind Supply Co.",
    authorPhotoUrl: null,
    rating: 5,
    textContent:
      "We went from a handful of reviews to a wall full of them in under a week. Setup took minutes.",
    videoUrl: null,
    submittedAt: 1_700_000_000_000,
  },
  {
    id: "sample-2",
    type: "text",
    authorName: "Priya Natarajan",
    authorTitle: "Founder",
    authorCompany: "Loom & Co.",
    authorPhotoUrl: null,
    rating: 5,
    textContent:
      "Our customers love leaving feedback this way, and we love how easy it is to show it off.",
    videoUrl: null,
    submittedAt: 1_700_086_400_000,
  },
  {
    id: "sample-3",
    type: "text",
    authorName: "Marcus Webb",
    authorTitle: "Operations Lead",
    authorCompany: "Fieldstone Analytics",
    authorPhotoUrl: null,
    rating: 4,
    textContent: "Exactly what we needed to build trust on our pricing page without any dev work.",
    videoUrl: null,
    submittedAt: 1_700_172_800_000,
  },
];

export function getWallSampleTestimonials(): EmbedTestimonial[] {
  return WALL_SAMPLE_TESTIMONIALS;
}

// Illustration content for the Single testimonial type's two example cards
// (shown before the real testimonial picker) — sample data, not generic
// placeholder copy. The text example renders through the real
// SingleTestimonial component; the video example is a lightweight static
// mock (no real sample video asset exists to actually play).
export const SINGLE_TESTIMONIAL_TEXT_EXAMPLE: EmbedTestimonial = {
  id: "example-text",
  type: "text",
  authorName: "Priya Natarajan",
  authorTitle: "Founder",
  authorCompany: "Loom & Co.",
  authorPhotoUrl: null,
  rating: 5,
  textContent:
    "Our customers love leaving feedback this way, and we love how easy it is to show it off.",
  videoUrl: null,
  submittedAt: 1_700_086_400_000,
};

export const SINGLE_TESTIMONIAL_VIDEO_EXAMPLE = {
  authorName: "Jordan Lee",
  authorTitle: "Head of Growth",
  authorCompany: "Northwind Supply Co.",
};
