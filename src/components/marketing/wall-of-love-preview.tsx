import { TestimonialGrid } from "@/components/embed/testimonial-grid";
import { Badge } from "@/components/ui/badge";
import { SAMPLE_TESTIMONIALS } from "./sample-testimonials";
import type { EmbedStyle } from "@/components/embed/types";

const PREVIEW_STYLE: EmbedStyle = {
  theme: "light",
  layout: "grid",
  columns: 3,
  showRating: true,
  showAvatar: true,
  showDate: false,
};

export function WallOfLovePreview() {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">Wall of Love — live preview</p>
        <Badge variant="secondary">Sample data</Badge>
      </div>
      <TestimonialGrid testimonials={SAMPLE_TESTIMONIALS} style={PREVIEW_STYLE} />
    </div>
  );
}
