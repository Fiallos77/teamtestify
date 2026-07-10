// Content types the recorder/upload widget actually produces (see
// pickMimeType in src/components/public/video-recorder.tsx and the
// codec-stripping in the public collection page before upload).
export const ALLOWED_VIDEO_CONTENT_TYPES = new Set(["video/webm", "video/mp4"]);
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

export type StoredFileMeta = { contentType?: string | null; size: number } | null;

export function isAcceptableVideoUpload(meta: StoredFileMeta): boolean {
  if (!meta) return false;
  if (!ALLOWED_VIDEO_CONTENT_TYPES.has(meta.contentType ?? "")) return false;
  if (meta.size > MAX_VIDEO_BYTES) return false;
  return true;
}
