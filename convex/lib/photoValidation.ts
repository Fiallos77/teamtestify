// Mirrors videoValidation.ts — the author photo on the public testimonial
// form went through generateUploadUrl (spaceId/visitorId rate-limited, but
// otherwise generic) with no post-upload check at all, unlike the video.
// Anyone calling the mutations directly (not just the form's own
// accept="image/*" input, which is a UI hint only) could attach an
// arbitrary-type, arbitrary-size file as "authorPhotoStorageId".
export const ALLOWED_PHOTO_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export type StoredFileMeta = { contentType?: string | null; size: number } | null;

export function isAcceptablePhotoUpload(meta: StoredFileMeta): boolean {
  if (!meta) return false;
  if (!ALLOWED_PHOTO_CONTENT_TYPES.has(meta.contentType ?? "")) return false;
  if (meta.size > MAX_PHOTO_BYTES) return false;
  return true;
}
