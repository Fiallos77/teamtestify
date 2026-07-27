import { describe, expect, test } from "vitest";
import { pathToRegexp } from "next/dist/compiled/path-to-regexp";
import nextConfig from "./next.config";

function headersFor(rules: Awaited<ReturnType<NonNullable<typeof nextConfig.headers>>>, path: string) {
  const applied: Record<string, string> = {};
  for (const rule of rules) {
    if (pathToRegexp(rule.source).test(path)) {
      for (const { key, value } of rule.headers) applied[key] = value;
    }
  }
  return applied;
}

describe("next.config headers", () => {
  test("does not leak the x-powered-by header", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  test("applies clickjacking/MIME/HSTS headers to ordinary routes", async () => {
    const rules = await nextConfig.headers!();
    for (const path of ["/", "/dashboard", "/dashboard/settings", "/privacy-policy"]) {
      const applied = headersFor(rules, path);
      expect(applied["X-Frame-Options"]).toBe("DENY");
      expect(applied["X-Content-Type-Options"]).toBe("nosniff");
      expect(applied["Strict-Transport-Security"]).toBe(
        "max-age=31536000; includeSubDomains"
      );
    }
  });

  test("does not send X-Frame-Options on /embed, which must stay embeddable cross-origin", async () => {
    const rules = await nextConfig.headers!();
    const applied = headersFor(rules, "/embed/widget123");
    expect(applied["X-Frame-Options"]).toBeUndefined();
    expect(applied["Content-Security-Policy"]).toBe("frame-ancestors *");
  });
});
