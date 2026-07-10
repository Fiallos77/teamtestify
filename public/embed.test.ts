// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, test } from "vitest";

const source = readFileSync(path.resolve(__dirname, "./embed.js"), "utf8");

// embed.js is a plain script (loaded via <script src="/embed.js">, not a
// module) that runs as an IIFE against the ambient `window`/`document`.
// Since jsdom's environment already provides those globals, we can execute
// the real file content directly instead of reimplementing its logic —
// this exercises the actual shipped asset, not a stand-in.
function loadEmbedScript() {
  new Function(source)();
}

const APP_ORIGIN = "https://app.example.com"; // matches vitest.config.ts jsdom url
const WIDGET_ID = "w1";

function postResizeMessage(origin: string, height: number) {
  window.dispatchEvent(
    new MessageEvent("message", {
      origin,
      data: { source: "testimonial-widget-resize", widgetId: WIDGET_ID, height },
    })
  );
}

describe("public/embed.js message listener", () => {
  beforeEach(() => {
    document.body.innerHTML = `<div data-testimonial-widget="${WIDGET_ID}"></div>`;
  });

  test("ignores a resize message from an untrusted origin", () => {
    loadEmbedScript();
    const iframe = document.querySelector("iframe") as HTMLIFrameElement;
    expect(iframe).not.toBeNull();
    expect(iframe.style.height).toBe("0px");

    postResizeMessage("https://evil.example.com", 999);

    expect(iframe.style.height).toBe("0px");
  });

  test("applies a resize message from the app's own origin", () => {
    loadEmbedScript();
    const iframe = document.querySelector("iframe") as HTMLIFrameElement;

    postResizeMessage(APP_ORIGIN, 456);

    expect(iframe.style.height).toBe("456px");
  });
});
