import { describe, expect, it } from "vitest";
import { resolveLayoutSelection, resolveSaveMode, stepBack } from "./widget-wizard-navigation";
import { WALL_LAYOUT_PRESETS } from "./widget-layout-presets";

describe("stepBack", () => {
  it("steps back from ready to customize", () => {
    expect(stepBack("ready")).toBe("customize");
  });

  it("steps back from customize to layout", () => {
    expect(stepBack("customize")).toBe("layout");
  });

  it("has no earlier step than layout", () => {
    expect(stepBack("layout")).toBe("layout");
  });
});

describe("resolveSaveMode", () => {
  it("creates when no draft widget exists yet", () => {
    expect(resolveSaveMode(null)).toBe("create");
  });

  it("updates the same draft once it has been created", () => {
    expect(resolveSaveMode("jn7fbmjjm0v7w51xqkepz6wx098axr8n")).toBe("update");
  });
});

describe("resolveLayoutSelection", () => {
  const masonryPreset = WALL_LAYOUT_PRESETS.find((p) => p.id === "masonry")!;
  const carouselPreset = WALL_LAYOUT_PRESETS.find((p) => p.id === "carousel")!;

  it("re-selecting the already-active layout preserves prior customization", () => {
    const current = { ...masonryPreset.appearance, accentColor: "#ff0000" };
    expect(resolveLayoutSelection(current, masonryPreset)).toBe(current);
  });

  it("switching to a genuinely different layout resets to that preset's appearance", () => {
    const current = { ...masonryPreset.appearance, accentColor: "#ff0000" };
    expect(resolveLayoutSelection(current, carouselPreset)).toBe(carouselPreset.appearance);
  });
});
