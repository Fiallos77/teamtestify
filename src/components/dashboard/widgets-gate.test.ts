import { describe, expect, test } from "vitest";
import { WIDGETS_LOCKED_MESSAGE, isWidgetsLocked } from "./widgets-gate";

describe("isWidgetsLocked", () => {
  test("locked with zero approved testimonials", () => {
    expect(isWidgetsLocked(0)).toBe(true);
  });

  test("unlocked once at least one testimonial is approved", () => {
    expect(isWidgetsLocked(1)).toBe(false);
    expect(isWidgetsLocked(42)).toBe(false);
  });

  test("exposes the exact locked-state copy", () => {
    expect(WIDGETS_LOCKED_MESSAGE).toBe("Approve your first testimonial to create widgets");
  });
});
