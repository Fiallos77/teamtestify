import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { POST } from "./route";
import { signRenderContext } from "../../../../convex/lib/imageToken";

const original = process.env.IMAGE_RENDER_SECRET;
beforeEach(() => {
  process.env.IMAGE_RENDER_SECRET = "test-secret";
});
afterEach(() => {
  if (original === undefined) delete process.env.IMAGE_RENDER_SECRET;
  else process.env.IMAGE_RENDER_SECRET = original;
});

function makeToken(watermark: boolean) {
  return signRenderContext({
    testimonialId: "t_1",
    watermark,
    primaryColor: "#4f46e5",
    content: { authorName: "María González", authorTitle: "Fundadora", rating: 5 },
  });
}
// makeToken is async (Web Crypto); tests await it.

function reqWith(body: unknown) {
  return new Request("http://localhost/api/testimonial-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function pngBytes(res: Response) {
  return Buffer.from(await res.arrayBuffer());
}

describe("POST /api/testimonial-image", () => {
  test("renders a PNG for a valid signed request", async () => {
    const res = await POST(
      reqWith({ token: await makeToken(true), layout: "giant-quote", size: "square", headline: "Recuperamos horas" })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    const png = await pngBytes(res);
    expect(png[0]).toBe(0x89);
    expect(png[1]).toBe(0x50);
    expect(png.length).toBeGreaterThan(1000);
  });

  test("rejects a tampered token (401) — watermark can't be stripped", async () => {
    const token = await makeToken(true);
    const tampered = token.slice(0, -3) + "aaa";
    const res = await POST(reqWith({ token: tampered, layout: "giant-quote", size: "square", headline: "x" }));
    expect(res.status).toBe(401);
  });

  test("rejects an unknown layout (400)", async () => {
    const res = await POST(reqWith({ token: await makeToken(false), layout: "nope", size: "square", headline: "x" }));
    expect(res.status).toBe(400);
  });

  test("rejects an empty headline (400)", async () => {
    const res = await POST(reqWith({ token: await makeToken(false), layout: "giant-quote", size: "portrait", headline: "   " }));
    expect(res.status).toBe(400);
  });
});
