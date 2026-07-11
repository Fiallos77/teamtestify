import { verifyRenderToken } from "../../../../convex/lib/imageToken";
import { renderTestimonialImage } from "@/lib/testimonial-image/render";
import { sanitize } from "@/lib/testimonial-image/layouts";
import {
  IMAGE_SIZE_KEYS,
  LAYOUT_IDS,
  type ImageSizeKey,
  type LayoutId,
} from "@/lib/testimonial-image/types";

// Renders a chosen testimonial-image proposal to PNG. Node runtime because
// sharp is native. The tamper-sensitive inputs (watermark, brand color, whose
// testimonial, photo) come from the HMAC-signed token minted by the Convex
// generateImageProposal action — a Free user can't strip the watermark by
// editing the request. Only the layout/size/headline (the user's own choices
// and content) are read from the body. The route is under /api and gated to
// logged-in users by src/proxy.ts.
export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json().catch(() => null)) as {
    token?: string;
    layout?: string;
    size?: string;
    headline?: string;
  } | null;
  if (!body) return new Response("Bad request", { status: 400 });

  const ctx = await verifyRenderToken(String(body.token ?? ""));
  if (!ctx) return new Response("Invalid or expired render token", { status: 401 });

  if (!(LAYOUT_IDS as readonly string[]).includes(String(body.layout))) {
    return new Response("Unknown layout", { status: 400 });
  }
  if (!(IMAGE_SIZE_KEYS as readonly string[]).includes(String(body.size))) {
    return new Response("Unknown size", { status: 400 });
  }
  const quote = sanitize(String(body.headline ?? "")).slice(0, 240);
  if (!quote) return new Response("Empty headline", { status: 400 });

  // Best-effort inline the client photo (background priority: photo > color).
  let photoDataUri: string | undefined;
  if (ctx.content.photoUrl) {
    try {
      const r = await fetch(ctx.content.photoUrl);
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        const mime = r.headers.get("content-type") ?? "image/jpeg";
        photoDataUri = `data:${mime};base64,${buf.toString("base64")}`;
      }
    } catch {
      photoDataUri = undefined;
    }
  }

  const png = await renderTestimonialImage({
    layout: body.layout as LayoutId,
    size: body.size as ImageSizeKey,
    colors: { primary: ctx.primaryColor },
    watermark: ctx.watermark,
    content: {
      quote,
      authorName: ctx.content.authorName,
      authorTitle: ctx.content.authorTitle,
      authorCompany: ctx.content.authorCompany,
      authorHandle: ctx.content.authorHandle,
      rating: ctx.content.rating,
      photoDataUri,
    },
  });

  return new Response(new Uint8Array(png), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="testimonial-${body.size}.png"`,
      "Cache-Control": "no-store",
    },
  });
}
