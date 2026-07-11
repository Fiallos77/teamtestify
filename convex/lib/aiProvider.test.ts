import { afterEach, describe, expect, test, vi } from "vitest";
import { generateText } from "./aiProvider";

const originalFetch = global.fetch;
const originalKey = process.env.GEMINI_API_KEY;

afterEach(() => {
  global.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = originalKey;
  vi.restoreAllMocks();
});

describe("generateText — Gemini provider seam", () => {
  test("posts the prompt to gemini-3.5-flash and returns the text", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ candidates: [{ content: { parts: [{ text: "hola mundo" }] } }] }),
          { status: 200 }
        )
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const out = await generateText({ prompt: "di hola" });
    expect(out).toBe("hola mundo");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(url)).toContain("gemini-3.5-flash");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-key");
    const body = JSON.parse(init.body as string);
    expect(body.contents[0].parts[0].text).toBe("di hola");
  });

  test("passes a system instruction through when provided", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }),
          { status: 200 }
        )
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    await generateText({ prompt: "p", system: "you are helpful" });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.systemInstruction.parts[0].text).toBe("you are helpful");
  });

  test("throws when GEMINI_API_KEY is missing", async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(generateText({ prompt: "x" })).rejects.toThrow(/GEMINI_API_KEY/);
  });

  test("throws on a non-OK response", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    global.fetch = vi.fn(
      async () => new Response("upstream boom", { status: 500 })
    ) as unknown as typeof fetch;
    await expect(generateText({ prompt: "x" })).rejects.toThrow();
  });
});
