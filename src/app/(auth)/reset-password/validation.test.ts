import { describe, expect, test } from "vitest";
import { initialResetPasswordStep, passwordsMismatch } from "./validation";

describe("initialResetPasswordStep", () => {
  test("no token in the URL -> the request-email step", () => {
    expect(initialResetPasswordStep(null)).toBe("request");
  });

  test("an empty token param (?token=) -> the request-email step, not reset", () => {
    expect(initialResetPasswordStep("")).toBe("request");
  });

  test("a real token in the URL (arrived via the email link) -> the reset step", () => {
    expect(initialResetPasswordStep("abc123")).toBe("reset");
  });
});

describe("passwordsMismatch", () => {
  test("flags differing values", () => {
    expect(passwordsMismatch("hunter2", "hunter3")).toBe(true);
  });

  test("does not flag identical values", () => {
    expect(passwordsMismatch("hunter2", "hunter2")).toBe(false);
  });
});
