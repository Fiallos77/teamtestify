import { afterEach, describe, expect, test, vi } from "vitest";
import { transcribeAudio } from "./transcription";

const originalFetch = global.fetch;
const originalKey = process.env.GROQ_API_KEY;

afterEach(() => {
  global.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = originalKey;
  vi.restoreAllMocks();
});

function blob() {
  return new Blob([new Uint8Array([1, 2, 3])], { type: "video/webm" });
}

describe("transcribeAudio", () => {
  test("posts the clip to Groq whisper-large-v3 and returns the transcript", async () => {
    process.env.GROQ_API_KEY = "gk_test";
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ text: "  hola equipo  " }), { status: 200 })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const out = await transcribeAudio(blob(), "clip.webm");
    expect(out).toBe("hola equipo");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(url)).toContain("groq.com");
    expect(String(url)).toContain("audio/transcriptions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer gk_test");
    const form = init.body as FormData;
    expect(form.get("model")).toBe("whisper-large-v3");
    expect(form.get("file")).toBeInstanceOf(Blob);
  });

  test("returns '' when GROQ_API_KEY is missing (no call made)", async () => {
    delete process.env.GROQ_API_KEY;
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    expect(await transcribeAudio(blob(), "clip.webm")).toBe("");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("returns '' on a non-OK response", async () => {
    process.env.GROQ_API_KEY = "gk_test";
    global.fetch = vi.fn(
      async () => new Response("rate limited", { status: 429 })
    ) as unknown as typeof fetch;
    expect(await transcribeAudio(blob(), "clip.webm")).toBe("");
  });

  test("returns '' when the request throws (network error)", async () => {
    process.env.GROQ_API_KEY = "gk_test";
    global.fetch = vi.fn(async () => {
      throw new Error("boom");
    }) as unknown as typeof fetch;
    expect(await transcribeAudio(blob(), "clip.webm")).toBe("");
  });
});
