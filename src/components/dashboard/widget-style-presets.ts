import type { EmbedTestimonial } from "@/components/embed/types";
import { defaultAppearanceState, type WidgetAppearanceState } from "./widget-appearance";

// Curated style presets for the creation flow's step 1 gallery. Each preset
// is a full WidgetAppearanceState (built from the same defaults the rest of
// the app uses) so picking one seeds step 2/3 with real, previewable values —
// no new widget types or layouts, just different combinations of existing
// appearance fields (layout/theme/accent/avatar/date).
export interface WidgetStylePreset {
  id: string;
  type: "wall" | "single";
  label: string;
  description: string;
  appearance: WidgetAppearanceState;
}

export const WIDGET_STYLE_PRESETS: WidgetStylePreset[] = [
  {
    id: "wall-grid",
    type: "wall",
    label: "Grid",
    description: "A clean grid — great for a dedicated testimonials page.",
    appearance: { ...defaultAppearanceState("wall"), layout: "grid", columns: 3 },
  },
  {
    id: "wall-masonry",
    type: "wall",
    label: "Masonry",
    description: "Staggered columns that fill the page like a mood board.",
    appearance: {
      ...defaultAppearanceState("wall"),
      layout: "masonry",
      columns: 3,
      accentColor: "#0EA5E9",
    },
  },
  {
    id: "wall-carousel",
    type: "wall",
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
  {
    id: "single-classic",
    type: "single",
    label: "Classic",
    description: "A simple quote card with rating and author details.",
    appearance: { ...defaultAppearanceState("single"), theme: "light" },
  },
  {
    id: "single-dark",
    type: "single",
    label: "Dark",
    description: "High-contrast card that pops on a light page.",
    appearance: {
      ...defaultAppearanceState("single"),
      theme: "dark",
      accentColor: "#8B5CF6",
    },
  },
  {
    id: "single-minimal",
    type: "single",
    label: "Minimal",
    description: "Just the quote — no avatar or date, for a quiet look.",
    appearance: {
      ...defaultAppearanceState("single"),
      theme: "light",
      showAvatar: false,
      showDate: false,
    },
  },
];

export function getStylePresets(type: "wall" | "single"): WidgetStylePreset[] {
  return WIDGET_STYLE_PRESETS.filter((preset) => preset.type === type);
}

// Realistic sample content for the gallery's preview cards — real-looking
// testimonials, not "Lorem ipsum" or "Sample text here", since a style
// preset is easiest to judge with content that looks like the real thing.
// Fixed submittedAt keeps this deterministic (no Date.now() at module scope).
const SAMPLE_TESTIMONIALS: EmbedTestimonial[] = [
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

// Wall presets get the full sample set (so grid/masonry/carousel have enough
// cards to look real); a single-testimonial preset only ever shows one.
export function getSampleTestimonials(type: "wall" | "single"): EmbedTestimonial[] {
  return type === "single" ? [SAMPLE_TESTIMONIALS[0]] : SAMPLE_TESTIMONIALS;
}

// Whether two appearance states are field-for-field identical — used to
// highlight the gallery card matching the flow's current selection (e.g.
// after navigating Back from a later step) without relying on key order.
export function isSameAppearance(a: WidgetAppearanceState, b: WidgetAppearanceState): boolean {
  const aKeys = Object.keys(a) as (keyof WidgetAppearanceState)[];
  const bKeys = Object.keys(b);
  return aKeys.length === bKeys.length && aKeys.every((key) => a[key] === b[key]);
}
