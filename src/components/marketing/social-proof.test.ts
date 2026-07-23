import { describe, expect, test } from "vitest";
import { SOCIAL_PROOF_HEADING } from "./social-proof";

describe("marketing social proof copy", () => {
  test("heading points forward to upcoming features instead of just 'new'", () => {
    expect(SOCIAL_PROOF_HEADING).toBe("New features coming soon, built for your growth");
  });
});
