import { describe, expect, test } from "vitest";
import sharp from "sharp";
import { renderTestimonialImage } from "./render";
import { sanitize } from "./layouts";
import {
  IMAGE_SIZES,
  IMAGE_SIZE_KEYS,
  LAYOUT_IDS,
  type BackgroundType,
  type RenderSpec,
} from "./types";

const baseContent = {
  quote: "Nos ahorró horas cada semana y el equipo por fin respira.",
  authorName: "María González",
  authorTitle: "Fundadora",
  authorCompany: "Estudio Brío",
  rating: 5,
};

function spec(over: Partial<RenderSpec> = {}): RenderSpec {
  return {
    layout: "editorial-serif",
    size: "square",
    content: baseContent,
    colors: { primary: "#4f46e5" },
    headerLabel: "Testimonio de Cliente",
    footer: "estudiobrio.com",
    background: { type: "solid" },
    watermark: false,
    ...over,
  };
}

function isPng(buf: Buffer): boolean {
  return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
}

async function redDotDataUri(): Promise<string> {
  const png = await sharp({
    create: { width: 4, height: 4, channels: 3, background: { r: 220, g: 40, b: 40 } },
  })
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

describe("renderTestimonialImage — all 14 layouts x 3 sizes", () => {
  for (const layout of LAYOUT_IDS) {
    for (const size of IMAGE_SIZE_KEYS) {
      test(`${layout} @ ${size} renders a correctly-sized PNG`, async () => {
        const png = await renderTestimonialImage(spec({ layout, size }));
        expect(isPng(png)).toBe(true);
        const meta = await sharp(png).metadata();
        expect(meta.width).toBe(IMAGE_SIZES[size].width);
        expect(meta.height).toBe(IMAGE_SIZES[size].height);
      });
    }
  }
});

describe("backgrounds", () => {
  for (const type of ["photo", "texture", "solid"] as BackgroundType[]) {
    test(`background ${type} renders (photo has a data uri)`, async () => {
      const photoDataUri = type === "photo" ? await redDotDataUri() : undefined;
      const png = await renderTestimonialImage(spec({ layout: "photo-feature", background: { type, photoDataUri } }));
      expect(isPng(png)).toBe(true);
    });
  }

  test("photo type without a resolved photo degrades gracefully (still renders)", async () => {
    const png = await renderTestimonialImage(spec({ layout: "photo-feature", background: { type: "photo" } }));
    expect(isPng(png)).toBe(true);
  });
});

describe("avatar (client photo)", () => {
  test("renders with an avatar photo and differs from the no-photo fallback", async () => {
    const withPhoto = await renderTestimonialImage(
      spec({ layout: "spotlight-avatar", content: { ...baseContent, avatarDataUri: await redDotDataUri() } })
    );
    const withoutPhoto = await renderTestimonialImage(spec({ layout: "spotlight-avatar" }));
    expect(isPng(withPhoto)).toBe(true);
    expect(isPng(withoutPhoto)).toBe(true);
    expect(withPhoto.length).not.toBe(withoutPhoto.length);
  });
});

describe("watermark", () => {
  test("watermark flag changes the output", async () => {
    const off = await renderTestimonialImage(spec({ layout: "bold-gradient", watermark: false }));
    const on = await renderTestimonialImage(spec({ layout: "bold-gradient", watermark: true }));
    expect(off.length).not.toBe(on.length);
  });
});

describe("sanitize", () => {
  test("strips emoji/symbols but keeps Latin + accents", () => {
    expect(sanitize("Genial 💪🔥 servicio")).toBe("Genial servicio");
    expect(sanitize("Atención de María — ¡excelente!")).toBe("Atención de María — ¡excelente!");
  });
  test("collapses whitespace and trims", () => {
    expect(sanitize("  hola   mundo \n\t ")).toBe("hola mundo");
  });
});
