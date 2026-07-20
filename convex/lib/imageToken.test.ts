import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  IMAGE_RENDER_TOKEN_TTL_MS,
  signRenderContext,
  verifyRenderToken,
  type RenderContext,
} from "./imageToken";

const ctx: Omit<RenderContext, "exp"> = {
  testimonialId: "t_123",
  watermark: true,
  primaryColor: "#4f46e5",
  content: { authorName: "María González", rating: 5 },
};

const original = process.env.IMAGE_RENDER_SECRET;
beforeEach(() => {
  process.env.IMAGE_RENDER_SECRET = "test-secret";
});
afterEach(() => {
  if (original === undefined) delete process.env.IMAGE_RENDER_SECRET;
  else process.env.IMAGE_RENDER_SECRET = original;
});

describe("imageToken", () => {
  test("round-trips a signed context", async () => {
    const token = await signRenderContext(ctx);
    const verified = await verifyRenderToken(token);
    expect(verified).toMatchObject(ctx);
    expect(verified?.exp).toBeGreaterThan(Date.now());
  });

  test("rejects a tampered payload (e.g. flipping watermark to false)", async () => {
    const token = await signRenderContext(ctx);
    const [payload, mac] = token.split(".");
    const forged = JSON.parse(Buffer.from(payload, "base64url").toString());
    forged.watermark = false;
    const forgedPayload = Buffer.from(JSON.stringify(forged)).toString("base64url");
    const tampered = `${forgedPayload}.${mac}`;
    expect(await verifyRenderToken(tampered)).toBeNull();
  });

  test("rejects a token signed with a different secret", async () => {
    const token = await signRenderContext(ctx);
    process.env.IMAGE_RENDER_SECRET = "different-secret";
    expect(await verifyRenderToken(token)).toBeNull();
  });

  test("rejects a malformed token", async () => {
    expect(await verifyRenderToken("garbage")).toBeNull();
    expect(await verifyRenderToken("")).toBeNull();
    expect(await verifyRenderToken(".")).toBeNull();
  });

  test("throws when the secret is unset (signing)", async () => {
    delete process.env.IMAGE_RENDER_SECRET;
    await expect(signRenderContext(ctx)).rejects.toThrow(/IMAGE_RENDER_SECRET/);
  });

  test("returns null once the token has expired", async () => {
    vi.useFakeTimers();
    try {
      const token = await signRenderContext(ctx);
      vi.advanceTimersByTime(IMAGE_RENDER_TOKEN_TTL_MS + 1);
      expect(await verifyRenderToken(token)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  test("still verifies just under the expiry window", async () => {
    vi.useFakeTimers();
    try {
      const token = await signRenderContext(ctx);
      vi.advanceTimersByTime(IMAGE_RENDER_TOKEN_TTL_MS - 1);
      expect(await verifyRenderToken(token)).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
