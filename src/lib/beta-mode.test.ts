import { describe, expect, test } from "vitest";
import { isBetaModeValue } from "./beta-mode";

describe("isBetaModeValue", () => {
  test("true only when the flag is exactly the string \"true\"", () => {
    expect(isBetaModeValue("true")).toBe(true);
  });

  test("false when unset", () => {
    expect(isBetaModeValue(undefined)).toBe(false);
  });

  test("false for any other value", () => {
    expect(isBetaModeValue("false")).toBe(false);
    expect(isBetaModeValue("1")).toBe(false);
    expect(isBetaModeValue("")).toBe(false);
  });
});
