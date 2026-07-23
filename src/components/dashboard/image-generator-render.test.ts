import { describe, expect, test } from "vitest";
import { buildRenderRequestBody, type ImageProposal } from "./image-generator-render";

const proposal: ImageProposal = {
  layout: "editorial-serif",
  headline: "AI-written headline",
  headerLabel: "Client Testimonial",
  backgroundType: "texture",
};

describe("buildRenderRequestBody", () => {
  test("uses the caller-provided headline, not the proposal's original", () => {
    const body = buildRenderRequestBody({
      token: "tok",
      footer: undefined,
      proposal,
      headline: "User-edited headline",
      size: "square",
    });
    expect(body.headline).toBe("User-edited headline");
  });

  test("carries the rest of the proposal through unchanged", () => {
    const body = buildRenderRequestBody({
      token: "tok",
      footer: "acme.com",
      proposal: { ...proposal, bgPhotoUrl: "https://images.pexels.com/x.jpg" },
      headline: "Edited",
      size: "story",
    });
    expect(body).toEqual({
      token: "tok",
      footer: "acme.com",
      layout: "editorial-serif",
      headline: "Edited",
      headerLabel: "Client Testimonial",
      backgroundType: "texture",
      bgPhotoUrl: "https://images.pexels.com/x.jpg",
      size: "story",
    });
  });

  test("defaults footer and bgPhotoUrl to empty string when absent", () => {
    const body = buildRenderRequestBody({
      token: "tok",
      footer: undefined,
      proposal,
      headline: "Edited",
      size: "square",
    });
    expect(body.footer).toBe("");
    expect(body.bgPhotoUrl).toBe("");
  });
});
