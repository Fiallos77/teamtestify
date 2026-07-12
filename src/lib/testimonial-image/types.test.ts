import { describe, expect, test } from "vitest";
import { IMAGE_SIZES, IMAGE_SIZE_KEYS } from "./types";

// The export buttons render `network` as their label and `label` (pixel
// dimensions) as small text / tooltip. Verify the network names exist for the
// three sizes and that the dimensions are still present.
describe("IMAGE_SIZES export labels", () => {
  test("each size has a network name and its pixel-dimension label", () => {
    for (const size of IMAGE_SIZE_KEYS) {
      expect(IMAGE_SIZES[size].network).toBeTruthy();
      expect(IMAGE_SIZES[size].label).toMatch(/^\d+×\d+$/);
    }
  });

  test("network names match the three social export targets", () => {
    expect(IMAGE_SIZES.square.network).toBe("Instagram Feed (Square)");
    expect(IMAGE_SIZES.portrait.network).toBe("Instagram Feed (Vertical)");
    expect(IMAGE_SIZES.story.network).toBe("Stories/Reels");
  });

  test("pixel dimensions are retained (not replaced)", () => {
    expect(IMAGE_SIZES.square.label).toBe("1080×1080");
    expect(IMAGE_SIZES.portrait.label).toBe("1080×1350");
    expect(IMAGE_SIZES.story.label).toBe("1080×1920");
  });
});
