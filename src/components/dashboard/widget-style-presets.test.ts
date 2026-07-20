import { describe, expect, test } from "vitest";
import {
  WIDGET_STYLE_PRESETS,
  getSampleTestimonials,
  getStylePresets,
  isSameAppearance,
} from "./widget-style-presets";
import { defaultAppearanceState } from "./widget-appearance";

const PLACEHOLDER_PATTERN = /lorem ipsum|placeholder|sample text/i;

describe("getStylePresets", () => {
  test("offers 2-3 presets for wall, each with a distinct layout", () => {
    const wallPresets = getStylePresets("wall");
    expect(wallPresets.length).toBeGreaterThanOrEqual(2);
    expect(wallPresets.length).toBeLessThanOrEqual(3);
    expect(wallPresets.every((p) => p.type === "wall")).toBe(true);
    const layouts = wallPresets.map((p) => p.appearance.layout);
    expect(new Set(layouts).size).toBe(layouts.length);
  });

  test("offers 2-3 presets for single, each visually distinct", () => {
    const singlePresets = getStylePresets("single");
    expect(singlePresets.length).toBeGreaterThanOrEqual(2);
    expect(singlePresets.length).toBeLessThanOrEqual(3);
    expect(singlePresets.every((p) => p.type === "single")).toBe(true);
    // No two single presets should be pixel-identical in appearance.
    for (let i = 0; i < singlePresets.length; i++) {
      for (let j = i + 1; j < singlePresets.length; j++) {
        expect(isSameAppearance(singlePresets[i].appearance, singlePresets[j].appearance)).toBe(
          false
        );
      }
    }
  });

  test("every preset has a unique id and non-empty label/description", () => {
    const ids = WIDGET_STYLE_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const preset of WIDGET_STYLE_PRESETS) {
      expect(preset.label.trim().length).toBeGreaterThan(0);
      expect(preset.description.trim().length).toBeGreaterThan(0);
    }
  });

  test("no widget types beyond the existing wall/single", () => {
    expect(WIDGET_STYLE_PRESETS.every((p) => p.type === "wall" || p.type === "single")).toBe(
      true
    );
  });
});

describe("getSampleTestimonials", () => {
  test("wall gets multiple realistic sample testimonials", () => {
    const samples = getSampleTestimonials("wall");
    expect(samples.length).toBeGreaterThanOrEqual(2);
    for (const t of samples) {
      expect(t.textContent).toBeTruthy();
      expect(t.textContent!.length).toBeGreaterThan(20);
      expect(t.textContent).not.toMatch(PLACEHOLDER_PATTERN);
      expect(t.authorName.trim().length).toBeGreaterThan(0);
    }
  });

  test("single gets exactly one sample testimonial", () => {
    expect(getSampleTestimonials("single")).toHaveLength(1);
  });
});

describe("isSameAppearance", () => {
  test("true for field-for-field identical states", () => {
    const a = defaultAppearanceState("wall");
    const b = { ...a };
    expect(isSameAppearance(a, b)).toBe(true);
  });

  test("false when a single field differs", () => {
    const a = defaultAppearanceState("wall");
    const b = { ...a, layout: "carousel" as const };
    expect(isSameAppearance(a, b)).toBe(false);
  });
});
