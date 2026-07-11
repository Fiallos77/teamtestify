import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

// satori needs embedded font data (no system-font fallback) and accepts
// TTF/OTF/WOFF — not WOFF2. We ship Inter 400/700 via @fontsource/inter, whose
// files/ directory contains .woff. Resolve through the package.json so the
// lookup works from both vitest (ESM) and the Next route handler regardless of
// cwd, and doesn't depend on the package's own "exports" exposing the asset.
const require_ = createRequire(import.meta.url);

function loadWoff(file: string): Buffer {
  const pkgJson = require_.resolve("@fontsource/inter/package.json");
  return readFileSync(join(dirname(pkgJson), "files", file));
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
