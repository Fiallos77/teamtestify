import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { POST } from "./route";
import { signRenderContext } from "../../../../convex/lib/imageToken";

const original = process.env.IMAGE_RENDER_SECRET;
const originalFetch = global.fetch;
beforeEach(() => {
  process.env.IMAGE_RENDER_SECRET = "test-secret";
});
afterEach(() => {
  if (original === undefined) delete process.env.IMAGE_RENDER_SECRET;
  else process.env.IMAGE_RENDER_SECRET = original;
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

function makeToken(watermark: boolean, photoUrl?: string) {
  return signRenderContext({
    testimonialId: "t_1",
    watermark,
    primaryColor: "#4f46e5",
    content: { authorName: "María González", authorTitle: "Fundadora", rating: 5, photoUrl },
  });
}

function reqWith(body: unknown) {
  return new Request("http://localhost/api/testimonial-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/testimonial-image", () => {
  test("renders a PNG for a valid signed request", async () => {
    const res = await POST(
      reqWith({ token: await makeToken(true), layout: "editorial-serif", size: "story", headline: "Recuperamos horas", headerLabel: "Testimonio", footer: "acme.com", backgroundType: "solid" })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    const png = Buffer.from(await res.arrayBuffer());
    expect(png[0]).toBe(0x89);
    expect(png.length).toBeGreaterThan(1000);
  });

  test("all 3 sizes render for a proposal", async () => {
    const token = await makeToken(false);
    for (const size of ["square", "portrait", "story"]) {
      const res = await POST(reqWith({ token, layout: "gold-luxe", size, headline: "Hola", headerLabel: "Test", backgroundType: "texture" }));
      expect(res.status).toBe(200);
    }
  });

  test("rejects a tampered token (401) — watermark can't be stripped", async () => {
    const token = await makeToken(true);
    const res = await POST(reqWith({ token: token.slice(0, -3) + "aaa", layout: "editorial-serif", size: "square", headline: "x", backgroundType: "solid" }));
    expect(res.status).toBe(401);
  });

  test("rejects unknown layout / empty headline (400)", async () => {
    expect((await POST(reqWith({ token: await makeToken(false), layout: "nope", size: "square", headline: "x", backgroundType: "solid" }))).status).toBe(400);
    expect((await POST(reqWith({ token: await makeToken(false), layout: "editorial-serif", size: "square", headline: "  ", backgroundType: "solid" }))).status).toBe(400);
  });

  test("SSRF guard: a non-Pexels bg url is never fetched; renders with a texture fallback", async () => {
    const fetchMock = vi.fn(async () => new Response("secret", { status: 200 }));
    global.fetch = fetchMock as unknown as typeof fetch;
    const res = await POST(
      reqWith({ token: await makeToken(false), layout: "photo-feature", size: "square", headline: "Hi", headerLabel: "Test", backgroundType: "photo", bgPhotoUrl: "http://169.254.169.254/latest/meta-data" })
    );
    expect(res.status).toBe(200); // degraded to texture, still renders
    expect(fetchMock).not.toHaveBeenCalled(); // the evil host was never fetched
  });
});
