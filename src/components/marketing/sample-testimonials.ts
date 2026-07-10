import type { EmbedTestimonial } from "@/components/embed/types";

// Fictional, clearly-labeled sample data for the marketing site only —
// never sourced from convex, never presented as real customers. Used by
// the hero's Wall of Love preview to show what the widget looks like
// before anyone has collected a single real testimonial.
export const SAMPLE_TESTIMONIALS: EmbedTestimonial[] = [
  {
    id: "sample-1",
    type: "text",
    authorName: "Jamie Chen",
    authorTitle: "Founder",
    authorCompany: "Brightleaf Studio",
    authorPhotoUrl: null,
    rating: 5,
    textContent:
      "We went from zero testimonials to a full Wall of Love in an afternoon. Customers just record a 30-second video right on our thank-you page.",
    videoUrl: null,
    submittedAt: Date.UTC(2026, 0, 14),
  },
  {
    id: "sample-2",
    type: "text",
    authorName: "Priya Nair",
    authorTitle: "Head of Marketing",
    authorCompany: "Nova Fitness Co.",
    authorPhotoUrl: null,
    rating: 5,
    textContent:
      "The moderation queue means nothing goes live without us reviewing it first. Embedding the widget took one script tag, no dev time.",
    videoUrl: null,
    submittedAt: Date.UTC(2026, 1, 2),
  },
  {
    id: "sample-3",
    type: "text",
    authorName: "Marcus Webb",
    authorTitle: "Owner",
    authorCompany: "Ledger & Co.",
    authorPhotoUrl: null,
    rating: 5,
    textContent:
      "Collection is unlimited even on the free plan, so we never worry about a customer's story not fitting in before we're ready to publish it.",
    videoUrl: null,
    submittedAt: Date.UTC(2026, 1, 20),
  },
];
