import { describe, expect, test } from "vitest";
import { DIFFERENTIATOR_HEADING } from "./differentiator";

describe("marketing differentiator copy", () => {
  test("heading matches the two points actually rendered below it", () => {
    expect(DIFFERENTIATOR_HEADING).toBe("Works with two simple ideas");
  });
});
