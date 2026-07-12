import { verifyRenderToken } from "../../../../convex/lib/imageToken";
import { isAllowedPhotoHost } from "../../../../convex/lib/pexels";
import { withRetry } from "../../../../convex/lib/retry";
import { renderTestimonialImage } from "@/lib/testimonial-image/render";
import { sanitize } from "@/lib/testimonial-image/layouts";
import {
  BACKGROUND_TYPES,
  IMAGE_SIZE_KEYS,
  LAYOUT_IDS,
  type BackgroundType,
  type ImageSizeKey,
  type LayoutId,
} from "@/lib/testimonial-image/types";

// Renders a chosen testimonial-image proposal to PNG. Node runtime because
// sharp is native. The tamper-sensitive inputs (watermark, brand color, whose
// testimonial, the client photo) come from the HMAC-signed token minted by the
// Convex action — a Free user can't strip the watermark by editing the request.
// The per-proposal choices (layout/size/headline/header/footer/background) are
// read from the body; the Pexels background url is fetched only if it passes
// the host allowlist (SSRF guard). Gated to logged-in users by src/proxy.ts.
export const runtime = "nodejs";

async function fetchAsDataUri(url: string): Promise<string | undefined> {
  try {
    const r = await withRetry(() => fetch(url), { retries: 1 });
    if (!r.ok) return undefined;
    const buf = Buffer.from(await r.arrayBuffer());
    const mime = r.headers.get("content-type") ?? "image/jpeg";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return undefined;
  }
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return new Response("Bad request", { status: 400 });

  const ctx = await verifyRenderToken(String(body.token ?? ""));
  if (!ctx) return new Response("Invalid or expired render token", { status: 401 });

  const layout = String(body.layout ?? "");
  const size = String(body.size ?? "");
  if (!(LAYOUT_IDS as readonly string[]).includes(layout)) {
    return new Response("Unknown layout", { status: 400 });
  }
  if (!(IMAGE_SIZE_KEYS as readonly string[]).includes(size)) {
    return new Response("Unknown size", { status: 400 });
  }
  const quote = sanitize(String(body.headline ?? "")).slice(0, 240);
  if (!quote) return new Response("Empty headline", { status: 400 });

  const headerLabel = sanitize(String(body.headerLabel ?? "")).slice(0, 60);
  const footer = sanitize(String(body.footer ?? "")).slice(0, 80) || undefined;

  let backgroundType = (String(body.backgroundType ?? "solid")) as BackgroundType;
  if (!BACKGROUND_TYPES.includes(backgroundType)) backgroundType = "solid";

  // Resolve the Pexels background (SSRF-guarded) and the client avatar.
  let photoDataUri: string | undefined;
  if (backgroundType === "photo") {
    const bgUrl = String(body.bgPhotoUrl ?? "");
    photoDataUri = bgUrl && isAllowedPhotoHost(bgUrl) ? await fetchAsDataUri(bgUrl) : undefined;
    if (!photoDataUri) backgroundType = "texture"; // graceful
  }
  const avatarDataUri = ctx.content.photoUrl ? await fetchAsDataUri(ctx.content.photoUrl) : undefined;

  const png = await withRetry(
    () =>
      renderTestimonialImage({
        layout: layout as LayoutId,
        size: size as ImageSizeKey,
        colors: { primary: ctx.primaryColor },
        headerLabel,
        footer,
        background: { type: backgroundType, photoDataUri },
        watermark: ctx.watermark,
        content: {
          quote,
          authorName: ctx.content.authorName,
          authorTitle: ctx.content.authorTitle,
          authorCompany: ctx.content.authorCompany,
          authorHandle: ctx.content.authorHandle,
          rating: ctx.content.rating,
          avatarDataUri,
        },
      }),
    { retries: 1 }
  );

  return new Response(new Uint8Array(png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="testimonial-${size}.png"`,
      "Cache-Control": "no-store",
    },
  });
}
