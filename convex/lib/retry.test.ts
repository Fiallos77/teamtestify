import { describe, expect, test, vi } from "vitest";
import { withRetry } from "./retry";

describe("withRetry", () => {
  test("returns immediately on first success", async () => {
    const fn = vi.fn(async () => "ok");
    expect(await withRetry(fn, { baseMs: 1 })).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("retries once and succeeds on the second attempt", async () => {
    let n = 0;
    const fn = vi.fn(async () => {
      if (n++ === 0) throw new Error("transient");
      return "recovered";
    });
    expect(await withRetry(fn, { baseMs: 1 })).toBe("recovered");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("throws the last error after exhausting retries", async () => {
    const fn = vi.fn(async () => {
      throw new Error("still broken");
    });
    await expect(withRetry(fn, { retries: 1, baseMs: 1 })).rejects.toThrow("still broken");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
