import { afterEach, describe, expect, test, vi } from "vitest";
import { searchPhoto, isAllowedPhotoHost } from "./pexels";

const originalFetch = global.fetch;
const originalKey = process.env.PEXELS_API_KEY;
afterEach(() => {
  global.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.PEXELS_API_KEY;
  else process.env.PEXELS_API_KEY = originalKey;
  vi.restoreAllMocks();
});

function photosResponse(large2x: string) {
  return new Response(JSON.stringify({ photos: [{ src: { large2x, large: "l", original: "o" } }] }), { status: 200 });
}

describe("searchPhoto", () => {
  test("queries Pexels landscape and returns the large2x url", async () => {
    process.env.PEXELS_API_KEY = "pk_test";
    const fetchMock = vi.fn(async () => photosResponse("https://images.pexels.com/photos/1/x.jpg"));
    global.fetch = fetchMock as unknown as typeof fetch;

    const url = await searchPhoto("fitness gym");
    expect(url).toBe("https://images.pexels.com/photos/1/x.jpg");
    const [reqUrl, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(reqUrl)).toContain("api.pexels.com/v1/search");
    expect(String(reqUrl)).toContain("orientation=landscape");
    expect((init.headers as Record<string, string>).Authorization).toBe("pk_test");
  });

  test("returns null without a key (no call), on non-OK, on empty, and on throw", async () => {
    delete process.env.PEXELS_API_KEY;
    const noCall = vi.fn();
    global.fetch = noCall as unknown as typeof fetch;
    expect(await searchPhoto("food")).toBeNull();
    expect(noCall).not.toHaveBeenCalled();

    process.env.PEXELS_API_KEY = "pk_test";
    global.fetch = vi.fn(async () => new Response("nope", { status: 500 })) as unknown as typeof fetch;
    expect(await searchPhoto("food")).toBeNull();

    global.fetch = vi.fn(async () => new Response(JSON.stringify({ photos: [] }), { status: 200 })) as unknown as typeof fetch;
    expect(await searchPhoto("food")).toBeNull();

    global.fetch = vi.fn(async () => { throw new Error("net"); }) as unknown as typeof fetch;
    expect(await searchPhoto("food")).toBeNull();

    expect(await searchPhoto("   ")).toBeNull(); // empty query
  });
});

describe("isAllowedPhotoHost (SSRF guard)", () => {
  test("allows Pexels image hosts only", () => {
    expect(isAllowedPhotoHost("https://images.pexels.com/photos/1/x.jpg")).toBe(true);
    expect(isAllowedPhotoHost("https://evil.example.com/x.jpg")).toBe(false);
    expect(isAllowedPhotoHost("http://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isAllowedPhotoHost("not a url")).toBe(false);
  });
});
