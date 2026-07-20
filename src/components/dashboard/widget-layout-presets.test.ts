import { describe, expect, test } from "vitest";
import {
  SINGLE_TESTIMONIAL_TEXT_EXAMPLE,
  SINGLE_TESTIMONIAL_VIDEO_EXAMPLE,
  WALL_LAYOUT_PRESETS,
  getWallSampleTestimonials,
} from "./widget-layout-presets";

const PLACEHOLDER_PATTERN = /lorem ipsum|placeholder|sample text/i;

describe("WALL_LAYOUT_PRESETS", () => {
  test("offers exactly the 3 layouts the flow specifies, no grid", () => {
    const layouts = WALL_LAYOUT_PRESETS.map((p) => p.layout).sort();
    expect(layouts).toEqual(["carousel", "masonry", "masonry-animated"]);
  });

  test("every preset's appearance.layout matches its own layout", () => {
    for (const preset of WALL_LAYOUT_PRESETS) {
      expect(preset.appearance.layout).toBe(preset.layout);
    }
  });

  test("presets differ only in layout-driven fields, not an arbitrary style bundle", () => {
    // No preset overrides accentColor/theme/backgroundColor — step 1 is a
    // layout choice, not a full style pick (that's step 2).
    for (const preset of WALL_LAYOUT_PRESETS) {
      expect(preset.appearance.accentColor).toBe("");
      expect(preset.appearance.theme).toBe("auto");
    }
  });

  test("unique ids and non-empty copy", () => {
    const ids = WALL_LAYOUT_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const preset of WALL_LAYOUT_PRESETS) {
      expect(preset.label.trim().length).toBeGreaterThan(0);
      expect(preset.description.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("getWallSampleTestimonials", () => {
  test("returns multiple realistic samples, not placeholder text", () => {
    const samples = getWallSampleTestimonials();
    expect(samples.length).toBeGreaterThanOrEqual(2);
    for (const t of samples) {
      expect(t.textContent).toBeTruthy();
      expect(t.textContent!.length).toBeGreaterThan(20);
      expect(t.textContent).not.toMatch(PLACEHOLDER_PATTERN);
      expect(t.authorName.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("single testimonial examples", () => {
  test("text example has real-looking content", () => {
    expect(SINGLE_TESTIMONIAL_TEXT_EXAMPLE.textContent).not.toMatch(PLACEHOLDER_PATTERN);
    expect(SINGLE_TESTIMONIAL_TEXT_EXAMPLE.textContent!.length).toBeGreaterThan(20);
  });

  test("video example has author details for the illustration card", () => {
    expect(SINGLE_TESTIMONIAL_VIDEO_EXAMPLE.authorName.trim().length).toBeGreaterThan(0);
    expect(SINGLE_TESTIMONIAL_VIDEO_EXAMPLE.authorTitle.trim().length).toBeGreaterThan(0);
  });
});
