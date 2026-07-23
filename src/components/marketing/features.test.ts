import { describe, expect, test } from "vitest";
import { FEATURES } from "./features";

describe("marketing features copy", () => {
  test("the embed card reads as an action, not a tech term", () => {
    const feature = FEATURES.find((f) => f.body.includes("One script tag"));
    expect(feature?.title).toBe("Paste and go");
  });

  test("the recording card names both device types", () => {
    const feature = FEATURES.find((f) => f.body.includes("straight from their camera"));
    expect(feature?.title).toBe("Record videos directly on your phone or computer");
  });
});
