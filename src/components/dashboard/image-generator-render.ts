import type { ImageSizeKey } from "@/lib/testimonial-image/types";

export type ImageProposal = {
  layout: string;
  headline: string;
  headerLabel: string;
  backgroundType: string;
  bgPhotoUrl?: string;
};

// `headline` is a separate param from `proposal.headline` on purpose: the user
// can edit the AI's headline before rendering/downloading, and this is the one
// place that decides which value wins (always the caller's, never the
// proposal's original) — see image-generator.tsx's editable headline field.
export function buildRenderRequestBody({
  token,
  footer,
  proposal,
  headline,
  size,
}: {
  token: string;
  footer: string | undefined;
  proposal: ImageProposal;
  headline: string;
  size: ImageSizeKey;
}) {
  return {
    token,
    footer: footer ?? "",
    layout: proposal.layout,
    headline,
    headerLabel: proposal.headerLabel,
    backgroundType: proposal.backgroundType,
    bgPhotoUrl: proposal.bgPhotoUrl ?? "",
    size,
  };
}
