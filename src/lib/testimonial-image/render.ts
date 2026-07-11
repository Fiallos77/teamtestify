import satori from "satori";
import sharp from "sharp";
import { buildLayout } from "./layouts";
import { loadFonts } from "./fonts";
import { IMAGE_SIZES, type RenderSpec } from "./types";

// Render a testimonial image spec to a PNG buffer. satori turns the layout tree
// into an SVG (pure JS, works anywhere) and sharp rasterizes it to PNG (native
// — this is why rendering lives in a Next route handler, not a Convex action).
export async function renderTestimonialImage(spec: RenderSpec): Promise<Buffer> {
  const dims = IMAGE_SIZES[spec.size];
  const tree = buildLayout(spec, { width: dims.width, height: dims.height });

  const svg = await satori(tree as unknown as React.ReactNode, {
    width: dims.width,
    height: dims.height,
    fonts: loadFonts(),
  });

  return await sharp(Buffer.from(svg)).png().toBuffer();
}
