export type EmbedTestimonial = {
  id: string;
  type: "text" | "video";
  authorName: string;
  authorTitle?: string | null;
  authorCompany?: string | null;
  authorPhotoUrl: string | null;
  rating?: number | null;
  textContent?: string | null;
  videoUrl: string | null;
  submittedAt: number;
};

export type EmbedStyle = {
  theme: "light" | "dark" | "auto";
  accentColor?: string;
  backgroundColor?: string;
  layout: "grid" | "masonry" | "masonry-animated" | "carousel";
  columns?: number;
  rows?: number;
  showRating: boolean;
  showAvatar: boolean;
  showDate?: boolean;
  autoplaySeconds?: number;
  maxHeight?: number;
  scrollDirection?: "vertical" | "horizontal";
  scrollSpeed?: "slow" | "normal" | "fast";
  reverseDirection?: boolean;
  showHeartAnimation?: boolean;
};
