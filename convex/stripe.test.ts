import { afterEach, describe, expect, test } from "vitest";
import { assertSameOrigin } from "./stripe";

const originalAppUrl = process.env.APP_URL;

afterEach(() => {
  if (originalAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = originalAppUrl;
});

describe("assertSameOrigin", () => {
  test("accepts a returnUrl matching the app's own origin, any path/query", () => {
    process.env.APP_URL = "https://app.teamtestify.com";
    expect(() =>
      assertSameOrigin("https://app.teamtestify.com/dashboard/settings?checkout=success")
    ).not.toThrow();
  });

  test("rejects a returnUrl on a different origin (open redirect)", () => {
    process.env.APP_URL = "https://app.teamtestify.com";
    expect(() => assertSameOrigin("https://evil.example/phish")).toThrow();
  });

  test("rejects a returnUrl on a look-alike subdomain", () => {
    process.env.APP_URL = "https://app.teamtestify.com";
    expect(() => assertSameOrigin("https://app.teamtestify.com.evil.example")).toThrow();
  });

  test("rejects a malformed URL", () => {
    process.env.APP_URL = "https://app.teamtestify.com";
    expect(() => assertSameOrigin("not a url")).toThrow();
  });

  test("throws when APP_URL is not configured", () => {
    delete process.env.APP_URL;
    expect(() => assertSameOrigin("https://app.teamtestify.com/settings")).toThrow(/APP_URL/);
  });
});
