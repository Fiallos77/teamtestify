import { describe, expect, test } from "vitest";
import {
  ALLOWED_PHOTO_CONTENT_TYPES,
  MAX_PHOTO_BYTES,
  isAcceptablePhotoUpload,
} from "./photoValidation";

describe("isAcceptablePhotoUpload", () => {
  test("accepts image/jpeg under the size limit", () => {
    expect(
      isAcceptablePhotoUpload({ contentType: "image/jpeg", size: 1024 })
    ).toBe(true);
  });

  test("accepts image/png under the size limit", () => {
    expect(
      isAcceptablePhotoUpload({ contentType: "image/png", size: 1024 })
    ).toBe(true);
  });

  test("accepts image/webp under the size limit", () => {
    expect(
      isAcceptablePhotoUpload({ contentType: "image/webp", size: 1024 })
    ).toBe(true);
  });

  test("accepts exactly at the size boundary", () => {
    expect(
      isAcceptablePhotoUpload({ contentType: "image/jpeg", size: MAX_PHOTO_BYTES })
    ).toBe(true);
  });

  test("rejects one byte over the size boundary", () => {
    expect(
      isAcceptablePhotoUpload({
        contentType: "image/jpeg",
        size: MAX_PHOTO_BYTES + 1,
      })
    ).toBe(false);
  });

  test("rejects a disallowed content type", () => {
    expect(
      isAcceptablePhotoUpload({ contentType: "application/x-msdownload", size: 1024 })
    ).toBe(false);
    expect(
      isAcceptablePhotoUpload({ contentType: "text/html", size: 1024 })
    ).toBe(false);
  });

  test("rejects a null/missing content type", () => {
    expect(isAcceptablePhotoUpload({ contentType: null, size: 1024 })).toBe(false);
  });

  test("rejects a null metadata (file doesn't exist)", () => {
    expect(isAcceptablePhotoUpload(null)).toBe(false);
  });

  test("allowlist is exactly jpeg, png, and webp", () => {
    expect([...ALLOWED_PHOTO_CONTENT_TYPES].sort()).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
  });
});
