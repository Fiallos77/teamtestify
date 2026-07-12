import { readFileSync } from "node:fs";
import { join } from "node:path";

// satori needs embedded font data (no system-font fallback) and accepts
// TTF/OTF/WOFF — not WOFF2. We ship three families via @fontsource so layouts
// can mix them deliberately:
//   - Inter (sans)            — body / meta / footer
//   - Playfair Display (serif)— display headlines, quotes, header labels
//   - Dancing Script (script) — accent flourishes ("Client Testimonial" etc.)
//
// Read from the project root at runtime: createRequire(import.meta.url) works
// in vitest but Next's Turbopack rewrites import.meta.url to a virtual
// "[project]/..." path in the bundled route handler, so the file wouldn't
// resolve on disk. process.cwd() is the project root in both the dev server
// and vitest.
export const FONT_SANS = "Inter";
export const FONT_SERIF = "Playfair Display";
export const FONT_SCRIPT = "Dancing Script";

function loadWoff(pkg: string, file: string): Buffer {
  return readFileSync(join(process.cwd(), "node_modules", "@fontsource", pkg, "files", file));
}

export interface SatoriFont {
  name: string;
  data: Buffer;
  weight: 400 | 700;
  style: "normal";
}

let cached: SatoriFont[] | null = null;

export function loadFonts(): SatoriFont[] {
  if (cached) return cached;
  cached = [
    { name: FONT_SANS, data: loadWoff("inter", "inter-latin-400-normal.woff"), weight: 400, style: "normal" },
    { name: FONT_SANS, data: loadWoff("inter", "inter-latin-700-normal.woff"), weight: 700, style: "normal" },
    { name: FONT_SERIF, data: loadWoff("playfair-display", "playfair-display-latin-400-normal.woff"), weight: 400, style: "normal" },
    { name: FONT_SERIF, data: loadWoff("playfair-display", "playfair-display-latin-700-normal.woff"), weight: 700, style: "normal" },
    { name: FONT_SCRIPT, data: loadWoff("dancing-script", "dancing-script-latin-400-normal.woff"), weight: 400, style: "normal" },
    { name: FONT_SCRIPT, data: loadWoff("dancing-script", "dancing-script-latin-700-normal.woff"), weight: 700, style: "normal" },
  ];
  return cached;
}
