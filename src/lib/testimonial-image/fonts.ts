import { readFileSync } from "node:fs";
import { join } from "node:path";

// satori needs embedded font data (no system-font fallback) and accepts
// TTF/OTF/WOFF — not WOFF2. We ship Inter 400/700 via @fontsource/inter, whose
// files/ directory contains .woff. Read from the project root at runtime:
// createRequire(import.meta.url) works in vitest but Next's Turbopack rewrites
// import.meta.url to a virtual "[project]/..." path in the bundled route
// handler, so the file wouldn't resolve on disk. process.cwd() is the project
// root in both the dev server and vitest.
function loadWoff(file: string): Buffer {
  return readFileSync(
    join(process.cwd(), "node_modules", "@fontsource", "inter", "files", file)
  );
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
    { name: "Inter", data: loadWoff("inter-latin-400-normal.woff"), weight: 400, style: "normal" },
    { name: "Inter", data: loadWoff("inter-latin-700-normal.woff"), weight: 700, style: "normal" },
  ];
  return cached;
}
