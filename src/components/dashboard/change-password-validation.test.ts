import { describe, expect, test } from "vitest";
import { CHANGE_PASSWORD_ERRORS, validateChangePassword } from "./change-password-validation";

describe("validateChangePassword", () => {
  test("flags mismatched new/confirm passwords", () => {
    expect(
      validateChangePassword({
        currentPassword: "old-pass",
        newPassword: "new-pass-1",
        confirmPassword: "new-pass-2",
      })
    ).toBe(CHANGE_PASSWORD_ERRORS.mismatch);
  });

  test("flags a new password identical to the current one", () => {
    expect(
      validateChangePassword({
        currentPassword: "same-pass",
        newPassword: "same-pass",
        confirmPassword: "same-pass",
      })
    ).toBe(CHANGE_PASSWORD_ERRORS.sameAsCurrent);
  });

  test("passes when new/confirm match and differ from current", () => {
    expect(
      validateChangePassword({
        currentPassword: "old-pass",
        newPassword: "new-pass",
        confirmPassword: "new-pass",
      })
    ).toBeNull();
  });

  test("checks the mismatch before the same-as-current rule", () => {
    // Both rules technically apply (new !== confirm, and new happens to
    // equal current); mismatch is the more actionable message to show first.
    expect(
      validateChangePassword({
        currentPassword: "old-pass",
        newPassword: "old-pass",
        confirmPassword: "something-else",
      })
    ).toBe(CHANGE_PASSWORD_ERRORS.mismatch);
  });
});
