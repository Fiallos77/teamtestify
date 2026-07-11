import { describe, expect, test } from "vitest";
import sharp from "sharp";
import { renderTestimonialImage } from "./render";
import { sanitize } from "./layouts";
import { IMAGE_SIZES, IMAGE_SIZE_KEYS, LAYOUT_IDS, type RenderSpec } from "./types";

const baseContent = {
  quote: "Nos ahorró horas cada semana y el equipo por fin respira.",
  authorName: "María González",
  authorTitle: "Fundadora",
  authorCompany: "Estudio Brío",
  rating: 5,
};

function isPng(buf: Buffer): boolean {
  return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
}

describe("renderTestimonialImage", () => {
  // Exit criterion: all 8 layouts render correctly in all 3 sizes.
  for (const layout of LAYOUT_IDS) {
    for (const size of IMAGE_SIZE_KEYS) {
      test(`${layout} @ ${size} renders a correctly-sized PNG`, async () => {
        const spec: RenderSpec = {
          layout,
          size,
          content: baseContent,
          colors: { primary: "#4f46e5" },
          watermark: false,
        };
        const png = await renderTestimonialImage(spec);
        expect(isPng(png)).toBe(true);
        const meta = await sharp(png).metadata();
        expect(meta.width).toBe(IMAGE_SIZES[size].width);
        expect(meta.height).toBe(IMAGE_SIZES[size].height);
      });
    }
  }

  test("watermark flag changes the output (badge is actually drawn)", async () => {
    const spec: RenderSpec = {
      layout: "giant-quote",
      size: "square",
      content: baseContent,
      colors: { primary: "#4f46e5" },
      watermark: false,
    };
    const without = await renderTestimonialImage(spec);
    const withMark = await renderTestimonialImage({ ...spec, watermark: true });
    // Same dimensions, different pixels — the watermark is rendered.
    expect(without.length).not.toBe(withMark.length);
    const a = await sharp(withMark).metadata();
    expect(a.width).toBe(1080);
  });

  test("renders without a photo (brand color block fallback) and with one", async () => {
    const spec: RenderSpec = {
      layout: "split-photo-color",
      size: "portrait",
      content: baseContent,
      colors: { primary: "#0ea5e9" },
      watermark: true,
    };
    const noPhoto = await renderTestimonialImage(spec);
    expect(isPng(noPhoto)).toBe(true);

    // 1x1 red PNG as a stand-in client photo.
    const redDot = await sharp({
      create: { width: 1, height: 1, channels: 3, background: { r: 255, g: 0, b: 0 } },
    }).png().toBuffer();
    const withPhoto = await renderTestimonialImage({
      ...spec,
      content: { ...baseContent, photoDataUri: `data:image/png;base64,${redDot.toString("base64")}` },
    });
    expect(isPng(withPhoto)).toBe(true);
  });
});

describe("sanitize", () => {
  test("strips emoji/symbols the font can't render but keeps Latin + accents", () => {
    expect(sanitize("Genial 💪🔥 servicio")).toBe("Genial servicio");
    expect(sanitize("Atención de María — ¡excelente!")).toBe("Atención de María — ¡excelente!");
  });

  test("collapses whitespace and trims", () => {
    expect(sanitize("  hola   mundo \n\t ")).toBe("hola mundo");
  });
});
