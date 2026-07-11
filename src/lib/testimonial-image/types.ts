// Phase 4B social image generator — shared types and constants for the
// code-rendered layout system. The layouts render via satori -> sharp in a
// Next.js route handler (sharp is native and can't run in a Convex action);
// the Convex side only picks the layout/headline/colors and meters quota.

export const IMAGE_SIZES = {
  square: { width: 1080, height: 1080, label: "1080×1080" },
  portrait: { width: 1080, height: 1350, label: "1080×1350" },
  story: { width: 1080, height: 1920, label: "1080×1920" },
} as const;

export type ImageSizeKey = keyof typeof IMAGE_SIZES;
export const IMAGE_SIZE_KEYS = Object.keys(IMAGE_SIZES) as ImageSizeKey[];

// The 8 code-rendered layouts. Order is the catalog order shown to the AI and
// the UI. Keep these ids stable — they're persisted in proposals and passed to
// the render route.
export const LAYOUT_IDS = [
  "split-photo-color",
  "giant-quote",
  "elegant-neutral",
  "vibrant-solid",
  "authentic-screenshot",
  "before-after",
  "cta-footer",
  "dark-premium",
] as const;

export type LayoutId = (typeof LAYOUT_IDS)[number];

export const LAYOUT_LABELS: Record<LayoutId, string> = {
  "split-photo-color": "Split photo / color",
  "giant-quote": "Giant quote",
  "elegant-neutral": "Elegant neutral",
  "vibrant-solid": "Vibrant solid",
  "authentic-screenshot": "Authentic screenshot",
  "before-after": "Before / after",
  "cta-footer": "CTA footer",
  "dark-premium": "Dark premium",
};

export interface TestimonialImageContent {
  /** The pull quote / headline hook to feature. */
  quote: string;
  authorName: string;
  authorTitle?: string;
  authorCompany?: string;
  /** e.g. "@janedoe" — used by the screenshot-style layout. */
  authorHandle?: string;
  /** 1–5; omitted hides the star row. */
  rating?: number;
  /**
   * Client photo as a data URI. Background priority is photo > brand color
   * block (a video *frame* would need ffmpeg, which isn't available here — for
   * video testimonials the Whisper transcript feeds the headline instead).
   */
  photoDataUri?: string;
}

export interface BrandColors {
  /** Brand primary as hex (e.g. "#4f46e5"). */
  primary: string;
}

export interface RenderSpec {
  layout: LayoutId;
  size: ImageSizeKey;
  content: TestimonialImageContent;
  colors: BrandColors;
  /** true on Free -> render the "Hecho con TeamTestify" badge; false on Pro. */
  watermark: boolean;
}

export const WATERMARK_TEXT = "Hecho con TeamTestify";
