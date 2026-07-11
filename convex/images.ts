"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { generateText } from "./lib/aiProvider";
import { transcribeAudio } from "./lib/transcription";
import { signRenderContext } from "./lib/imageToken";
import { currentMonth } from "./ai";
import type { AiFeature } from "./entitlements";

// Keep in sync with LAYOUT_IDS in src/lib/testimonial-image/types.ts — that's
// the render engine's source of truth; this copy is just the allowlist the AI
// output is validated against (the render engine lives under src/ and pulls in
// satori/sharp, which shouldn't be bundled into a Convex function).
const LAYOUT_IDS = [
  "split-photo-color",
  "giant-quote",
  "elegant-neutral",
  "vibrant-solid",
  "authentic-screenshot",
  "before-after",
  "cta-footer",
  "dark-premium",
] as const;
const LAYOUT_SET = new Set<string>(LAYOUT_IDS);

export interface ImageProposal {
  layout: string;
  headline: string;
}

// Parse the model's JSON into 2–3 valid proposals. Tolerant of a bare array or
// a { proposals: [...] } wrapper; drops entries with an unknown layout or empty
// headline; dedupes by layout; caps at 3. Throws if nothing usable survives so
// the caller refunds the credit instead of returning an empty result.
export function parseImageProposals(raw: string): ImageProposal[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("The AI response could not be read. Please try again.");
  }
  const arr = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { proposals?: unknown })?.proposals)
      ? (parsed as { proposals: unknown[] }).proposals
      : [];

  const seen = new Set<string>();
  const out: ImageProposal[] = [];
  for (const item of arr) {
    const layout = String((item as { layout?: unknown })?.layout ?? "").trim();
    const headline = String((item as { headline?: unknown })?.headline ?? "").trim();
    if (!LAYOUT_SET.has(layout) || !headline || seen.has(layout)) continue;
    seen.add(layout);
    out.push({ layout, headline });
    if (out.length >= 3) break;
  }
  if (out.length === 0) {
    throw new Error("The AI didn't return a usable image proposal. Please try again.");
  }
  return out;
}

const SYSTEM = [
  "You design social media images from customer testimonials.",
  "Pick 2–3 DISTINCT layouts from the provided catalog that best fit the",
  "testimonial, and for each write a short punchy headline hook (max ~80 chars)",
  "that captures the sentiment. Write headlines in the SAME LANGUAGE as the",
  "testimonial material. No emoji, no hashtags, no surrounding quotes.",
  'Respond as JSON: {"proposals":[{"layout":"<id>","headline":"<text>"}]}.',
].join(" ");

function buildPrompt(material: string, author: string): string {
  return [
    `Layout catalog (use these exact ids): ${LAYOUT_IDS.join(", ")}.`,
    `Testimonial author: ${author}`,
    "Testimonial material (quote or transcript):",
    material,
  ].join("\n");
}

export interface ImageProposalResult {
  proposals: ImageProposal[];
  token: string;
  watermark: boolean;
  remaining: number;
}

export const generateImageProposal = action({
  args: { testimonialId: v.id("testimonials") },
  handler: async (ctx, { testimonialId }): Promise<ImageProposalResult> => {
    const info = await ctx.runQuery(internal.imagesData.getImageProposalContext, {
      testimonialId,
    });

    // Reserve first — over-cap requests never reach the provider (fail closed).
    const month = currentMonth();
    const { remaining } = await ctx.runMutation(internal.ai.reserveAiCredit, {
      organizationId: info.organizationId,
      feature: "image" as AiFeature,
      month,
    });

    try {
      // Background priority is photo > brand color block; a video *frame* would
      // need ffmpeg, so for video testimonials we transcribe (best-effort) to
      // give the AI text to hook onto. Transcription never throws — it's "".
      let material = info.textContent.trim();
      if (!material && info.type === "video" && info.videoUrl) {
        try {
          const res = await fetch(info.videoUrl);
          if (res.ok) {
            const blob = await res.blob();
            material = await transcribeAudio(blob, "testimonial.webm");
          }
        } catch {
          material = "";
        }
      }
      const author = [info.authorName, info.authorTitle, info.authorCompany]
        .filter(Boolean)
        .join(", ");
      if (!material) material = `A happy customer: ${author || info.authorName}`;

      const raw = await generateText({
        system: SYSTEM,
        prompt: buildPrompt(material, author || info.authorName),
        responseMimeType: "application/json",
      });
      const proposals = parseImageProposals(raw);

      const token = await signRenderContext({
        testimonialId,
        watermark: info.watermark,
        primaryColor: info.primaryColor,
        content: {
          authorName: info.authorName,
          authorTitle: info.authorTitle,
          authorCompany: info.authorCompany,
          rating: info.rating,
          photoUrl: info.photoUrl ?? undefined,
        },
      });

      return { proposals, token, watermark: info.watermark, remaining };
    } catch (err) {
      await ctx.runMutation(internal.ai.refundAiCredit, {
        organizationId: info.organizationId,
        feature: "image" as AiFeature,
        month,
      });
      throw err;
    }
  },
});
