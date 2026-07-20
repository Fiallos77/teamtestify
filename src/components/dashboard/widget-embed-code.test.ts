import { describe, expect, test } from "vitest";
import { buildEmbedSnippet, buildHostedUrl } from "./widget-embed-code";
import type { Id } from "../../../convex/_generated/dataModel";

const widgetId = "abc123" as Id<"widgets">;

describe("buildEmbedSnippet", () => {
  test("includes the widget id and the origin's embed.js", () => {
    const snippet = buildEmbedSnippet("https://app.example.com", widgetId);
    expect(snippet).toContain('data-testimonial-widget="abc123"');
    expect(snippet).toContain('src="https://app.example.com/embed.js"');
    expect(snippet).toContain("async");
  });
});

describe("buildHostedUrl", () => {
  test("builds the direct hosted page link", () => {
    expect(buildHostedUrl("https://app.example.com", widgetId)).toBe(
      "https://app.example.com/embed/abc123"
    );
  });
});
