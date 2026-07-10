import { describe, expect, test } from "vitest";
import {
  ALLOWED_VIDEO_CONTENT_TYPES,
  MAX_VIDEO_BYTES,
  isAcceptableVideoUpload,
} from "./videoValidation";

describe("isAcceptableVideoUpload", () => {
  test("accepts video/webm under the size limit", () => {
    expect(
      isAcceptableVideoUpload({ contentType: "video/webm", size: 1024 })
    ).toBe(true);
  });

  test("accepts video/mp4 under the size limit", () => {
    expect(
      isAcceptableVideoUpload({ contentType: "video/mp4", size: 1024 })
    ).toBe(true);
  });

  test("accepts exactly at the size boundary", () => {
    expect(
      isAcceptableVideoUpload({ contentType: "video/webm", size: MAX_VIDEO_BYTES })
    ).toBe(true);
  });

  test("rejects one byte over the size boundary", () => {
    expect(
      isAcceptableVideoUpload({
        contentType: "video/webm",
        size: MAX_VIDEO_BYTES + 1,
      })
    ).toBe(false);
  });

  test("rejects a disallowed content type", () => {
    expect(
      isAcceptableVideoUpload({ contentType: "video/quicktime", size: 1024 })
    ).toBe(false);
    expect(
      isAcceptableVideoUpload({ contentType: "text/html", size: 1024 })
    ).toBe(false);
  });

  test("rejects a null/missing content type", () => {
    expect(isAcceptableVideoUpload({ contentType: null, size: 1024 })).toBe(false);
  });

  test("rejects a null metadata (file doesn't exist)", () => {
    expect(isAcceptableVideoUpload(null)).toBe(false);
  });

  test("allowlist is exactly webm and mp4", () => {
    expect([...ALLOWED_VIDEO_CONTENT_TYPES].sort()).toEqual([
      "video/mp4",
      "video/webm",
    ]);
  });
});
