"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { generateText } from "./lib/aiProvider";
import { transcribeAudio } from "./lib/transcription";
import { signRenderContext } from "./lib/imageToken";
import { currentMonth } from "./ai";
import type { AiFeature } from "./entitlements";
import { LAYOUT_SET, pickLayouts } from "./lib/imageLayouts";
import { searchPhoto } from "./lib/pexels";
import { withRetry } from "./lib/retry";

const BACKGROUND_TYPES = new Set(["photo", "texture", "solid"]);
type BgType = "photo" | "texture" | "solid";

export interface AiEntry {
  headline: string;
  headerLabel?: string;
  backgroundType: BgType;
  pexelsQuery?: string;
}

// Even with responseMimeType/JSON the model can wrap output in a ```json fence
// or add a stray sentence, so pull the JSON payload out before parsing.
function extractJson(raw: string): string {
  let s = raw.trim();
  const fenced = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) s = fenced[1].trim();
  if (s[0] !== "{" && s[0] !== "[") {
    const starts = [s.indexOf("{"), s.indexOf("[")].filter((i) => i >= 0);
    const start = starts.length ? Math.min(...starts) : -1;
    const end = Math.max(s.lastIndexOf("}"), s.lastIndexOf("]"));
    if (start >= 0 && end > start) s = s.slice(start, end + 1);
  }
  return s;
}

// Parse the model output into a map keyed by layout id. Tolerant of a bare
// array or { proposals: [...] }; keeps only entries whose layout is one of the
// assigned ids with a non-empty headline. Throws only when the payload can't be
// read at all (so the caller refunds); an empty-but-valid map is fine — the
// action fills any missing layout with a fallback headline.
export function parseAiProposals(raw: string): Record<string, AiEntry> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch {
    throw new Error("The AI response could not be read. Please try again.");
  }
  const arr = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { proposals?: unknown })?.proposals)
      ? (parsed as { proposals: unknown[] }).proposals
      : [];

  const map: Record<string, AiEntry> = {};
  for (const item of arr) {
    const o = (item ?? {}) as Record<string, unknown>;
    const layout = String(o.layout ?? "").trim();
    const headline = String(o.headline ?? "").trim();
    if (!LAYOUT_SET.has(layout) || !headline || map[layout]) continue;
    const bt = String(o.backgroundType ?? "").trim() as BgType;
    map[layout] = {
      headline,
      headerLabel: o.headerLabel ? String(o.headerLabel).trim() : undefined,
      backgroundType: BACKGROUND_TYPES.has(bt) ? bt : "texture",
      pexelsQuery: o.pexelsQuery ? String(o.pexelsQuery).trim().slice(0, 40) : undefined,
    };
  }
  return map;
}

const SYSTEM = [
  "You design social media images from customer testimonials.",
  "You are GIVEN three layout ids; for EACH, decide the best treatment.",
  "Return, per layout: a short punchy headline hook (max ~80 chars) in the",
  "SAME LANGUAGE as the testimonial; a header label (2-4 words, same language,",
  'e.g. "Client Testimonial"); a backgroundType of "photo", "texture", or',
  '"solid"; and, only when backgroundType is "photo", a 1-2 word English',
  "pexelsQuery describing the topic (food, fitness, home office, travel...).",
  "No emoji, no hashtags, no surrounding quotes.",
].join(" ");

function proposalSchema(layouts: string[]) {
  return {
    type: "object",
    properties: {
      proposals: {
        type: "array",
        items: {
          type: "object",
          properties: {
            layout: { type: "string", enum: layouts },
            headline: { type: "string" },
            headerLabel: { type: "string" },
            backgroundType: { type: "string", enum: ["photo", "texture", "solid"] },
            pexelsQuery: { type: "string" },
          },
          required: ["layout", "headline", "headerLabel", "backgroundType"],
        },
      },
    },
    required: ["proposals"],
  };
}

function buildPrompt(layouts: string[], material: string, author: string): string {
  return [
    `Assigned layout ids (return one proposal for EACH): ${layouts.join(", ")}.`,
    `Testimonial author: ${author}`,
    "Testimonial material (quote or transcript):",
    material,
  ].join("\n");
}

function fallbackHeadline(material: string, author: string): string {
  const first = material.split(/[.!?\n]/)[0]?.trim();
  return first && first.length >= 8 ? first.slice(0, 80) : `A happy customer: ${author}`;
}

export interface ImageProposal {
  layout: string;
  headline: string;
  headerLabel: string;
  backgroundType: BgType;
  bgPhotoUrl?: string;
}

export interface ImageProposalResult {
  proposals: ImageProposal[];
  footer?: string;
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
      // Server picks the 3 layouts (randomized, never the org's previous exact
      // set) for guaranteed variety; the AI decides headline/header/background/
      // query per assigned layout.
      const chosen = pickLayouts(info.previousLayouts);

      // Material: text content, else a best-effort video transcript (graceful).
      let material = info.textContent.trim();
      if (!material && info.type === "video" && info.videoUrl) {
        try {
          const res = await withRetry(() => fetch(info.videoUrl as string), { retries: 1 });
          if (res.ok) material = await transcribeAudio(await res.blob(), "testimonial.webm");
        } catch {
          material = "";
        }
      }
      const author = [info.authorName, info.authorTitle, info.authorCompany]
        .filter(Boolean)
        .join(", ");
      if (!material) material = `A happy customer: ${author || info.authorName}`;

      const raw = await withRetry(
        () =>
          generateText({
            system: SYSTEM,
            prompt: buildPrompt(chosen, material, author || info.authorName),
            responseMimeType: "application/json",
            responseSchema: proposalSchema(chosen),
          }),
        { retries: 1 }
      );
      const aiMap = parseAiProposals(raw);
      if (Object.keys(aiMap).length === 0) {
        throw new Error("The AI didn't return a usable image proposal. Please try again.");
      }

      const fallbackHeader = info.headerLabelOverride?.trim() || "Client Testimonial";
      const proposals: ImageProposal[] = [];
      for (const layout of chosen) {
        const a = aiMap[layout];
        let backgroundType: BgType = a?.backgroundType ?? "texture";
        let bgPhotoUrl: string | undefined;
        if (backgroundType === "photo") {
          const url = a?.pexelsQuery ? await searchPhoto(a.pexelsQuery) : null;
          if (url) bgPhotoUrl = url;
          else backgroundType = "texture"; // graceful: no key / no result
        }
        proposals.push({
          layout,
          headline: a?.headline || fallbackHeadline(material, author || info.authorName),
          headerLabel: info.headerLabelOverride?.trim() || a?.headerLabel || fallbackHeader,
          backgroundType,
          bgPhotoUrl,
        });
      }

      await ctx.runMutation(internal.imagesData.recordImageGeneration, {
        organizationId: info.organizationId,
        layouts: chosen,
      });

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

      return { proposals, footer: info.footer, token, watermark: info.watermark, remaining };
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
