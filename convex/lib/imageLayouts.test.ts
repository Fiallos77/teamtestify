import { describe, expect, test } from "vitest";
import { LAYOUT_IDS, LAYOUT_SET, pickLayouts, sameSet } from "./imageLayouts";
import { LAYOUT_IDS as ENGINE_LAYOUT_IDS } from "../../src/lib/testimonial-image/types";

// A seeded LCG so layout selection is deterministic in tests.
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe("imageLayouts", () => {
  test("the convex mirror matches the render engine's LAYOUT_IDS (no drift)", () => {
    expect([...LAYOUT_IDS]).toEqual([...ENGINE_LAYOUT_IDS]);
    expect(LAYOUT_IDS).toHaveLength(14);
  });

  test("pickLayouts returns 3 distinct, valid layouts", () => {
    const pick = pickLayouts([], seeded(1));
    expect(pick).toHaveLength(3);
    expect(new Set(pick).size).toBe(3);
    expect(pick.every((l) => LAYOUT_SET.has(l))).toBe(true);
  });

  test("is deterministic for a given rng seed", () => {
    expect(pickLayouts([], seeded(42))).toEqual(pickLayouts([], seeded(42)));
  });

  test("never repeats the exact previous set of 3, across many seeds", () => {
    // First selection with one seed becomes the "previous"; verify a second
    // selection (same or different seed) is never the identical set.
    for (let seed = 0; seed < 200; seed++) {
      const previous = pickLayouts([], seeded(seed));
      const next = pickLayouts(previous, seeded(seed)); // worst case: same seed
      expect(sameSet(next, previous)).toBe(false);
    }
  });
});
