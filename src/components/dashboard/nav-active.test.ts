import { describe, expect, test } from "vitest";
import { isNavItemActive } from "./nav-active";

describe("isNavItemActive", () => {
  test("exact links match only their own path", () => {
    expect(isNavItemActive("/dashboard", "/dashboard", true)).toBe(true);
    // Deeper routes share the "/dashboard" prefix but must not light it up.
    expect(isNavItemActive("/dashboard/settings", "/dashboard", true)).toBe(false);
    expect(isNavItemActive("/dashboard/spaces/abc", "/dashboard", true)).toBe(false);
  });

  test("non-exact links match the path and its sub-routes", () => {
    expect(isNavItemActive("/dashboard/settings", "/dashboard/settings")).toBe(true);
    expect(isNavItemActive("/dashboard/settings/plan", "/dashboard/settings")).toBe(true);
    expect(isNavItemActive("/dashboard", "/dashboard/settings")).toBe(false);
  });

  test("a sibling sharing a prefix is not active", () => {
    expect(isNavItemActive("/dashboard/settings-archive", "/dashboard/settings")).toBe(false);
  });
});
