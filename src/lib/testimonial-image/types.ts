// Phase 4B social image generator — shared types and constants for the
// code-rendered layout system. Layouts render via satori -> sharp in a Next.js
// route handler (sharp is native and can't run in a Convex action); the Convex
// side picks the layout/headline/background + meters quota.

// `network` is the human export label (social platform), shown on the button;
// `label` keeps the pixel dimensions for tooltips / error messages only.
export const IMAGE_SIZES = {
  square: { width: 1080, height: 1080, label: "1080×1080", network: "Instagram Feed" },
  portrait: { width: 1080, height: 1350, label: "1080×1350", network: "Facebook Feed" },
  story: { width: 1080, height: 1920, label: "1080×1920", network: "Stories & Reels" },
} as const;

export type ImageSizeKey = keyof typeof IMAGE_SIZES;
export const IMAGE_SIZE_KEYS = Object.keys(IMAGE_SIZES) as ImageSizeKey[];

// The 14 code-rendered layouts. Order is the catalog order. Keep ids stable —
// they're persisted (org.lastImageLayouts) and passed to the render route.
export const LAYOUT_IDS = [
  "editorial-serif",
  "soft-quote-card",
  "spotlight-avatar",
  "gold-luxe",
  "bold-gradient",
  "minimal-neutral",
  "photo-feature",
  "social-proof-card",
  "big-statement",
  "pastel-soft",
  "corner-frame",
  "sparkle-accent",
  "split-panel",
  "dark-premium",
] as const;

export type LayoutId = (typeof LAYOUT_IDS)[number];

export const LAYOUT_LABELS: Record<LayoutId, string> = {
  "editorial-serif": "Editorial serif",
  "soft-quote-card": "Soft quote card",
  "spotlight-avatar": "Spotlight avatar",
  "gold-luxe": "Gold luxe",
  "bold-gradient": "Bold gradient",
  "minimal-neutral": "Minimal neutral",
  "photo-feature": "Photo feature",
  "social-proof-card": "Social proof card",
  "big-statement": "Big statement",
  "pastel-soft": "Pastel soft",
  "corner-frame": "Corner frame",
  "sparkle-accent": "Sparkle accent",
  "split-panel": "Split panel",
  "dark-premium": "Dark premium",
};

// The AI chooses a background type per proposal based on the testimonial:
//  - photo:   a contextual Pexels stock photo (with a readability overlay)
//  - texture: a code-generated gradient/pattern from the brand color
//  - solid:   a clean solid with decorative accents
export type BackgroundType = "photo" | "texture" | "solid";
export const BACKGROUND_TYPES: BackgroundType[] = ["photo", "texture", "solid"];

export interface Background {
  type: BackgroundType;
  /** Resolved by the route (Pexels photo -> data URI) when type === "photo". */
  photoDataUri?: string;
}

export interface TestimonialImageContent {
  /** The pull quote / headline hook to feature. */
  quote: string;
  authorName: string;
  authorTitle?: string;
  authorCompany?: string;
  /** e.g. "@janedoe" — used by the social-proof-card layout. */
  authorHandle?: string;
  /** 1–5; omitted hides the star row. */
  rating?: number;
  /** Client photo as a data URI -> circular avatar (never a fullscreen bg). */
  avatarDataUri?: string;
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
  /** Header label zone, e.g. "Client Testimonial" (language-aware default). */
  headerLabel: string;
  /** Footer zone: website / handle from space config. Subtle; omitted if empty. */
  footer?: string;
  background: Background;
  /** true on Free -> render the "Hecho con TeamTestify" badge; false on Pro. */
  watermark: boolean;
}

export const WATERMARK_TEXT = "Hecho con TeamTestify";
