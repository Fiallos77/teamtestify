import { describe, expect, test } from "vitest";
import { formatLimit, formatUsage, isAtLimit } from "./plan-usage";

describe("plan usage formatting", () => {
  test("formatLimit renders a number or 'Unlimited' for null", () => {
    expect(formatLimit(5)).toBe("5");
    expect(formatLimit(0)).toBe("0");
    expect(formatLimit(null)).toBe("Unlimited");
  });

  test("formatUsage renders 'used / limit'", () => {
    expect(formatUsage(2, 5)).toBe("2 / 5");
    expect(formatUsage(3, null)).toBe("3 / Unlimited");
  });

  test("isAtLimit is true only when a finite limit is reached", () => {
    expect(isAtLimit(1, 5)).toBe(false);
    expect(isAtLimit(5, 5)).toBe(true);
    expect(isAtLimit(6, 5)).toBe(true);
    expect(isAtLimit(100, null)).toBe(false);
  });
});
