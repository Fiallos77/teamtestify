import { describe, expect, test } from "vitest";
import { isPublicRoute } from "./proxy";

describe("isPublicRoute", () => {
  test("the reset-password flow is reachable while logged out", () => {
    // The email link lands here with ?token=..., and the request-email step
    // has no session either — both must bypass the sign-in redirect.
    expect(isPublicRoute("/reset-password")).toBe(true);
    expect(isPublicRoute("/reset-password/abc123")).toBe(true);
  });

  test("sign-in and sign-up remain public", () => {
    expect(isPublicRoute("/sign-in")).toBe(true);
    expect(isPublicRoute("/sign-up")).toBe(true);
  });

  test("dashboard routes still require a session", () => {
    expect(isPublicRoute("/dashboard")).toBe(false);
    expect(isPublicRoute("/dashboard/settings")).toBe(false);
  });

  test("legal pages are reachable while logged out", () => {
    expect(isPublicRoute("/privacy-policy")).toBe(true);
    expect(isPublicRoute("/terms-of-service")).toBe(true);
  });
});
