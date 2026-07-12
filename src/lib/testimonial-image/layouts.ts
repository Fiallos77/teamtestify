import type { LayoutId, RenderSpec, TestimonialImageContent, Background } from "./types";
import { WATERMARK_TEXT } from "./types";
import { FONT_SANS, FONT_SERIF, FONT_SCRIPT } from "./fonts";

// Minimal satori node shape (object form of React elements). satori requires
// display:flex on any element with more than one child; leaf text nodes take a
// string child. We keep to that here.
type Style = Record<string, string | number | undefined>;
export type Node = { type: string; props: { style?: Style; children?: Child; src?: string } };
type Child = string | Node | (string | Node)[];

function el(type: string, style: Style | undefined, children?: Child): Node {
  return { type, props: { style, children } };
}
function img(src: string, style: Style): Node {
  return { type: "img", props: { src, style } };
}

// satori throws on glyphs no provided font can render. Our fonts cover Latin-1
// (incl. Spanish accents) + common punctuation but not emoji/CJK/symbols. Strip
// anything outside that safe range so AI/user text can never crash the render.
export function sanitize(input: string): string {
  return input
    .replace(/[^ -ɏ‐-‧‰-⁞]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// satori has no CSS color-mix(), so compute alpha/mixes into rgb()/rgba().
function hexToRgb(hex: string): [number, number, number] {
  let h = (hex || "").trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(h)) h = "4f46e5"; // safe fallback
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function frac(pct: string | number): number {
  const v = typeof pct === "number" ? pct : parseFloat(pct) / 100;
  return Math.max(0, Math.min(1, v));
}
function withAlpha(hex: string, pct: string | number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${frac(pct)})`;
}
// mix(A, B, wA): A weighted wA, B the rest (matches color-mix(in srgb, A wA%, B)).
function mix(hex: string, other: string, pct: string | number): string {
  const t = frac(pct);
  const a = hexToRgb(hex);
  const b = hexToRgb(other);
  const c = (i: number) => Math.round(a[i] * t + b[i] * (1 - t));
  return `rgb(${c(0)},${c(1)},${c(2)})`;
}

// --- decorative SVG data URIs ----------------------------------------------

function svgUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function starUri(fill: string): string {
  return svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${fill}" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`
  );
}

function sparkleUri(fill: string): string {
  return svgUri(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${fill}" d="M12 0c.6 5.4 3.6 8.4 9 9-5.4.6-8.4 3.6-9 9-.6-5.4-3.6-8.4-9-9 5.4-.6 8.4-3.6 9-9z"/></svg>`
  );
}

function starRow(rating: number, filled: string, empty: string, px: number): Node {
  const n = Math.max(0, Math.min(5, Math.round(rating)));
  const stars: Node[] = [];
  for (let i = 0; i < 5; i++) {
    stars.push(img(starUri(i < n ? filled : empty), { width: px, height: px, marginRight: px * 0.2 }));
  }
  return el("div", { display: "flex", flexDirection: "row" }, stars);
}

function sparkleCluster(color: string, x: number, y: number): Node {
  return el("div", { display: "flex", position: "absolute", top: y, left: x }, [
    img(sparkleUri(color), { width: 46, height: 46 }),
    img(sparkleUri(withAlpha(color, "60%")), { width: 26, height: 26, marginTop: 34, marginLeft: -6 }),
  ]);
}

function cornerBracket(color: string, corner: "tl" | "br"): Node {
  const base: Style = { display: "flex", position: "absolute", width: 120, height: 120 };
  const pos: Style =
    corner === "tl"
      ? { top: 56, left: 56, borderTop: `6px solid ${color}`, borderLeft: `6px solid ${color}` }
      : { bottom: 56, right: 56, borderBottom: `6px solid ${color}`, borderRight: `6px solid ${color}` };
  return el("div", { ...base, ...pos });
}

function softBlob(color: string, size: number, x: number, y: number): Node {
  return el("div", {
    display: "flex",
    position: "absolute",
    width: size,
    height: size,
    top: y,
    left: x,
    borderRadius: size,
    background: color,
  });
}

// --- shared content pieces --------------------------------------------------

interface Ctx {
  c: TestimonialImageContent;
  primary: string;
  quote: string;
  headerLabel: string;
  footer?: string;
  width: number;
  height: number;
}

function headerLabel(text: string, color: string, font: string, letter = 3): Node | null {
  const t = sanitize(text);
  if (!t) return null;
  return el(
    "div",
    {
      display: "flex",
      fontFamily: font,
      fontSize: font === FONT_SCRIPT ? 44 : 26,
      fontWeight: 700,
      letterSpacing: font === FONT_SCRIPT ? 0 : letter,
      textTransform: font === FONT_SCRIPT ? "none" : "uppercase",
      color,
    },
    t
  );
}

function footerRow(text: string | undefined, color: string): Node | null {
  const t = text ? sanitize(text) : "";
  if (!t) return null;
  return el(
    "div",
    { display: "flex", fontFamily: FONT_SANS, fontSize: 24, fontWeight: 400, letterSpacing: 0.5, color },
    t
  );
}

function initialsAvatar(name: string, size: number, bg: string, ring: string): Node {
  const letter = sanitize(name).slice(0, 1).toUpperCase() || "?";
  return el(
    "div",
    {
      display: "flex",
      width: size,
      height: size,
      borderRadius: size,
      background: bg,
      border: `4px solid ${ring}`,
      alignItems: "center",
      justifyContent: "center",
      fontFamily: FONT_SANS,
      fontSize: size * 0.42,
      fontWeight: 700,
      color: "#ffffff",
    },
    letter
  );
}

function avatarCircle(ctx: Ctx, size: number, ring: string, fallbackBg: string): Node {
  if (ctx.c.avatarDataUri) {
    // A bare <img> with borderRadius clips to a circle; a wrapping div with
    // overflow:hidden + border renders a square ring in satori.
    return img(ctx.c.avatarDataUri, {
      width: size,
      height: size,
      borderRadius: size,
      objectFit: "cover",
      border: `4px solid ${ring}`,
    });
  }
  return initialsAvatar(ctx.c.authorName, size, fallbackBg, ring);
}

function authorLines(ctx: Ctx, nameColor: string, metaColor: string, align: "flex-start" | "center" = "flex-start"): Node {
  const meta = [ctx.c.authorTitle, ctx.c.authorCompany].filter((s): s is string => !!s).map(sanitize).join(" · ");
  const kids: Node[] = [
    el("div", { display: "flex", fontFamily: FONT_SANS, fontSize: 32, fontWeight: 700, color: nameColor }, sanitize(ctx.c.authorName)),
  ];
  if (meta) kids.push(el("div", { display: "flex", fontFamily: FONT_SANS, fontSize: 24, fontWeight: 400, color: metaColor, marginTop: 4 }, meta));
  return el("div", { display: "flex", flexDirection: "column", alignItems: align }, kids);
}

// Author row = avatar + name/meta, optionally with stars stacked.
function authorRow(ctx: Ctx, nameColor: string, metaColor: string, ring: string, fallbackBg: string, starColor?: string): Node {
  const right: Node[] = [authorLines(ctx, nameColor, metaColor)];
  if (ctx.c.rating && starColor) right.unshift(el("div", { display: "flex", marginBottom: 8 }, [starRow(ctx.c.rating, starColor, withAlpha(starColor, "22%"), 26)]));
  return el("div", { display: "flex", flexDirection: "row", alignItems: "center" }, [
    avatarCircle(ctx, 96, ring, fallbackBg),
    el("div", { display: "flex", flexDirection: "column", marginLeft: 24 }, right),
  ]);
}

const LDQUO = "“";

// A soft rounded quote card with a giant decorative quote mark, the quote, and
// (optionally) a star row — the reusable centerpiece most layouts build on.
function quoteCard(
  ctx: Ctx,
  opts: {
    bg: string;
    quoteColor: string;
    markColor: string;
    quoteFont: string;
    quoteSize: number;
    shadow?: string;
    padding?: number;
    starColor?: string;
    width?: string | number;
  }
): Node {
  const kids: Node[] = [];
  if (ctx.c.rating && opts.starColor) {
    kids.push(el("div", { display: "flex", marginBottom: 26 }, [starRow(ctx.c.rating, opts.starColor, withAlpha(opts.starColor, "20%"), 34)]));
  }
  kids.push(
    el("div", { display: "flex", fontFamily: FONT_SERIF, fontSize: 150, fontWeight: 700, color: opts.markColor, height: 84, lineHeight: 1 }, LDQUO)
  );
  kids.push(
    el("div", { display: "flex", fontFamily: opts.quoteFont, fontSize: opts.quoteSize, fontWeight: opts.quoteFont === FONT_SANS ? 700 : 400, color: opts.quoteColor, lineHeight: 1.3, marginTop: 6 }, ctx.quote)
  );
  return el(
    "div",
    {
      display: "flex",
      flexDirection: "column",
      background: opts.bg,
      borderRadius: 40,
      padding: opts.padding ?? 72,
      width: opts.width ?? "100%",
      boxShadow: opts.shadow ?? "0 30px 80px rgba(0,0,0,0.18)",
    },
    kids
  );
}

// --- background system ------------------------------------------------------

// Returns the absolute-positioned background layer for a layout given its
// chosen background type. "photo" needs a resolved data URI (else it degrades
// to a texture); "texture" is a brand gradient; "solid" is a flat surface. The
// `tone` picks a light or dark treatment so text/card stay readable.
function backgroundLayer(
  bg: Background,
  primary: string,
  dims: { width: number; height: number },
  tone: "light" | "dark",
  solidColor: string
): Node {
  const base: Style = { display: "flex", position: "absolute", top: 0, left: 0, width: dims.width, height: dims.height };

  if (bg.type === "photo" && bg.photoDataUri) {
    const scrim = tone === "dark" ? "rgba(10,12,20,0.62)" : "rgba(255,255,255,0.30)";
    return el("div", { ...base }, [
      img(bg.photoDataUri, { position: "absolute", top: 0, left: 0, width: dims.width, height: dims.height, objectFit: "cover" }),
      el("div", { position: "absolute", top: 0, left: 0, width: dims.width, height: dims.height, background: scrim }),
    ]);
  }

  if (bg.type === "texture" || (bg.type === "photo" && !bg.photoDataUri)) {
    // Brand gradient — graceful fallback when a photo wasn't available.
    const g =
      tone === "dark"
        ? `linear-gradient(150deg, ${mix(primary, "#0a0a12", "55%")}, #0a0a12)`
        : `linear-gradient(150deg, ${withAlpha(primary, "22%")}, ${mix(primary, "#ffffff", "8%")})`;
    return el("div", { ...base, background: g });
  }

  // solid
  return el("div", { ...base, background: solidColor });
}

function watermarkBadge(color: string, onDark: boolean): Node {
  return el(
    "div",
    {
      position: "absolute",
      bottom: 40,
      right: 52,
      display: "flex",
      fontFamily: FONT_SANS,
      fontSize: 22,
      color: onDark ? "rgba(255,255,255,0.7)" : withAlpha(color, "65%"),
    },
    WATERMARK_TEXT
  );
}

// A vertically-centred content column with header on top and footer at bottom.
function frame(dims: { width: number; height: number }, padding: number, children: Node[], footer?: Node | null): Node {
  const col = el("div", { display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }, children);
  const kids: Node[] = [col];
  if (footer) kids.push(el("div", { display: "flex" }, [footer]));
  return el(
    "div",
    { position: "relative", display: "flex", flexDirection: "column", width: dims.width, height: dims.height, padding },
    kids
  );
}

// --- the 14 layouts ---------------------------------------------------------
// Each returns the full canvas (background + content); buildLayout adds the
// watermark. Signature: (ctx, bg, dims) => Node.

type Dims = { width: number; height: number };
type Layout = (ctx: Ctx, bg: Background, dims: Dims) => Node;

const editorialSerif: Layout = (ctx, bg, dims) => {
  const p = ctx.primary;
  return el("div", { position: "relative", display: "flex", width: dims.width, height: dims.height }, [
    backgroundLayer(bg, p, dims, "light", "#f6f4ef"),
    frame(dims, 96, [
      headerLabel(ctx.headerLabel, p, FONT_SERIF, 4) ?? el("div", {}),
      el("div", { display: "flex", width: 90, height: 4, background: p, marginTop: 22, marginBottom: 30 }),
      el("div", { display: "flex", fontFamily: FONT_SERIF, fontSize: 62, fontWeight: 700, color: "#1b1b1b", lineHeight: 1.22 }, ctx.quote),
      ...(ctx.c.rating ? [el("div", { display: "flex", marginTop: 34 }, [starRow(ctx.c.rating, p, withAlpha(p, "20%"), 34)])] : []),
      el("div", { display: "flex", marginTop: 40 }, [authorRow(ctx, "#1b1b1b", "#7a7a72", p, p)]),
    ], footerRow(ctx.footer, "#8a8a80")),
  ]);
};

const softQuoteCard: Layout = (ctx, bg, dims) => {
  const p = ctx.primary;
  return el("div", { position: "relative", display: "flex", width: dims.width, height: dims.height }, [
    backgroundLayer(bg, p, dims, "light", mix(p, "#ffffff", "16%")),
    frame(dims, 84, [
      el("div", { display: "flex", justifyContent: "center", marginBottom: 30 }, [headerLabel(ctx.headerLabel, "#ffffff", FONT_SCRIPT) ?? el("div", {})]),
      quoteCard(ctx, { bg: "#ffffff", quoteColor: "#1f2430", markColor: p, quoteFont: FONT_SERIF, quoteSize: 46, starColor: p }),
      el("div", { display: "flex", marginTop: 34, paddingLeft: 8 }, [authorRow(ctx, "#ffffff", "rgba(255,255,255,0.85)", "#ffffff", p)]),
    ], null),
  ]);
};

const spotlightAvatar: Layout = (ctx, bg, dims) => {
  const p = ctx.primary;
  return el("div", { position: "relative", display: "flex", width: dims.width, height: dims.height }, [
    backgroundLayer(bg, p, dims, "dark", mix(p, "#0a0a12", "50%")),
    el("div", { position: "relative", display: "flex", flexDirection: "column", width: dims.width, height: dims.height, padding: 90, alignItems: "center", justifyContent: "center" }, [
      el("div", { display: "flex", marginBottom: 30 }, [avatarCircle(ctx, 168, withAlpha(p, "70%"), p)]),
      headerLabel(ctx.headerLabel, withAlpha(p, "90%"), FONT_SCRIPT) ?? el("div", {}),
      ...(ctx.c.rating ? [el("div", { display: "flex", marginTop: 18, marginBottom: 8 }, [starRow(ctx.c.rating, p, "rgba(255,255,255,0.18)", 36)])] : []),
      el("div", { display: "flex", fontFamily: FONT_SERIF, fontSize: 52, fontWeight: 400, color: "#f5f6fa", lineHeight: 1.3, textAlign: "center", marginTop: 20 }, ctx.quote),
      el("div", { display: "flex", flexDirection: "column", alignItems: "center", marginTop: 34 }, [authorLines(ctx, "#ffffff", "rgba(255,255,255,0.7)", "center")]),
    ]),
  ]);
};

const goldLuxe: Layout = (ctx, bg, dims) => {
  const gold = "#d4b869";
  return el("div", { position: "relative", display: "flex", width: dims.width, height: dims.height }, [
    backgroundLayer(bg, ctx.primary, dims, "dark", "#111017"),
    cornerBracket(withAlpha(gold, "70%"), "tl"),
    cornerBracket(withAlpha(gold, "70%"), "br"),
    frame(dims, 108, [
      headerLabel(ctx.headerLabel, gold, FONT_SCRIPT) ?? el("div", {}),
      el("div", { display: "flex", width: 70, height: 2, background: gold, marginTop: 20, marginBottom: 30 }),
      ...(ctx.c.rating ? [el("div", { display: "flex", marginBottom: 24 }, [starRow(ctx.c.rating, gold, "rgba(255,255,255,0.14)", 34)])] : []),
      el("div", { display: "flex", fontFamily: FONT_SERIF, fontSize: 56, fontWeight: 400, color: "#f4f1ea", lineHeight: 1.28 }, ctx.quote),
      el("div", { display: "flex", marginTop: 40 }, [authorRow(ctx, "#f4f1ea", gold, gold, mix(gold, "#111017", "40%"))]),
    ], footerRow(ctx.footer, withAlpha(gold, "70%"))),
  ]);
};

const boldGradient: Layout = (ctx, bg, dims) => {
  const p = ctx.primary;
  const grad = bg.type === "photo" && bg.photoDataUri ? undefined : `linear-gradient(135deg, ${p}, ${mix(p, "#000000", "35%")})`;
  return el("div", { position: "relative", display: "flex", width: dims.width, height: dims.height, background: grad }, [
    ...(grad ? [] : [backgroundLayer(bg, p, dims, "dark", p)]),
    softBlob("rgba(255,255,255,0.10)", 460, dims.width - 260, -160),
    frame(dims, 96, [
      headerLabel(ctx.headerLabel, "rgba(255,255,255,0.9)", FONT_SANS) ?? el("div", {}),
      el("div", { display: "flex", fontFamily: FONT_SERIF, fontSize: 150, fontWeight: 700, color: "rgba(255,255,255,0.9)", height: 84, lineHeight: 1, marginTop: 20 }, LDQUO),
      el("div", { display: "flex", fontFamily: FONT_SANS, fontSize: 58, fontWeight: 700, color: "#ffffff", lineHeight: 1.22 }, ctx.quote),
      el("div", { display: "flex", marginTop: 42 }, [authorRow(ctx, "#ffffff", "rgba(255,255,255,0.82)", "#ffffff", mix(p, "#000000", "25%"), "#ffffff")]),
    ], footerRow(ctx.footer, "rgba(255,255,255,0.7)")),
  ]);
};

const minimalNeutral: Layout = (ctx, bg, dims) => {
  const p = ctx.primary;
  return el("div", { position: "relative", display: "flex", width: dims.width, height: dims.height }, [
    backgroundLayer(bg, p, dims, "light", "#faf9f7"),
    el("div", { position: "relative", display: "flex", flexDirection: "column", width: dims.width, height: dims.height, padding: 110, alignItems: "center", justifyContent: "center" }, [
      headerLabel(ctx.headerLabel, "#9a968c", FONT_SANS, 4) ?? el("div", {}),
      ...(ctx.c.rating ? [el("div", { display: "flex", marginTop: 26 }, [starRow(ctx.c.rating, p, "#e6e3dc", 36)])] : []),
      el("div", { display: "flex", fontFamily: FONT_SERIF, fontSize: 52, fontWeight: 400, color: "#2a2a28", lineHeight: 1.4, textAlign: "center", marginTop: 30 }, ctx.quote),
      el("div", { display: "flex", width: 60, height: 2, background: p, marginTop: 40, marginBottom: 28 }),
      el("div", { display: "flex", flexDirection: "column", alignItems: "center" }, [authorLines(ctx, "#2a2a28", "#9a968c", "center")]),
    ]),
  ]);
};

const photoFeature: Layout = (ctx, bg, dims) => {
  const p = ctx.primary;
  // Forces the photo treatment; graceful gradient when no photo resolved.
  const photoBg: Background = { type: "photo", photoDataUri: bg.photoDataUri };
  return el("div", { position: "relative", display: "flex", width: dims.width, height: dims.height }, [
    backgroundLayer(photoBg, p, dims, "dark", p),
    el("div", { position: "relative", display: "flex", flexDirection: "column", width: dims.width, height: dims.height, padding: 80, justifyContent: "flex-end" }, [
      el("div", { display: "flex", marginBottom: 22 }, [headerLabel(ctx.headerLabel, "#ffffff", FONT_SCRIPT) ?? el("div", {})]),
      quoteCard(ctx, { bg: "rgba(255,255,255,0.95)", quoteColor: "#1c2130", markColor: p, quoteFont: FONT_SERIF, quoteSize: 42, starColor: p, padding: 60 }),
      el("div", { display: "flex", marginTop: 28 }, [authorRow(ctx, "#ffffff", "rgba(255,255,255,0.85)", "#ffffff", p)]),
    ]),
  ]);
};

const socialProofCard: Layout = (ctx, bg, dims) => {
  const p = ctx.primary;
  const handle = ctx.c.authorHandle ? sanitize(ctx.c.authorHandle) : `@${sanitize(ctx.c.authorName).toLowerCase().replace(/\s+/g, "")}`;
  return el("div", { position: "relative", display: "flex", width: dims.width, height: dims.height }, [
    backgroundLayer(bg, p, dims, "light", mix(p, "#eef1f6", "10%")),
    el("div", { position: "relative", display: "flex", flexDirection: "column", width: dims.width, height: dims.height, padding: 90, justifyContent: "center" }, [
      el("div", { display: "flex", flexDirection: "column", background: "#ffffff", borderRadius: 36, padding: 64, boxShadow: "0 30px 70px rgba(0,0,0,0.14)" }, [
        el("div", { display: "flex", flexDirection: "row", alignItems: "center" }, [
          avatarCircle(ctx, 100, "#ffffff", p),
          el("div", { display: "flex", flexDirection: "column", marginLeft: 22, flex: 1 }, [
            el("div", { display: "flex", fontFamily: FONT_SANS, fontSize: 34, fontWeight: 700, color: "#0f172a" }, sanitize(ctx.c.authorName)),
            el("div", { display: "flex", fontFamily: FONT_SANS, fontSize: 26, color: "#64748b" }, handle),
          ]),
          ...(ctx.c.rating ? [starRow(ctx.c.rating, p, "#e5e7eb", 30)] : []),
        ]),
        el("div", { display: "flex", fontFamily: FONT_SANS, fontSize: 42, fontWeight: 400, color: "#0f172a", lineHeight: 1.36, marginTop: 34 }, ctx.quote),
      ]),
    ]),
  ]);
};

const bigStatement: Layout = (ctx, bg, dims) => {
  const p = ctx.primary;
  return el("div", { position: "relative", display: "flex", width: dims.width, height: dims.height }, [
    backgroundLayer(bg, p, dims, "light", "#111214"),
    frame(dims, 96, [
      headerLabel(ctx.headerLabel, p, FONT_SANS, 5) ?? el("div", {}),
      el("div", { display: "flex", fontFamily: FONT_SANS, fontSize: 78, fontWeight: 700, color: "#ffffff", lineHeight: 1.08, marginTop: 26 }, ctx.quote),
      ...(ctx.c.rating ? [el("div", { display: "flex", marginTop: 34 }, [starRow(ctx.c.rating, p, "rgba(255,255,255,0.16)", 38)])] : []),
      el("div", { display: "flex", marginTop: 40 }, [authorRow(ctx, "#ffffff", "rgba(255,255,255,0.6)", p, p)]),
    ], footerRow(ctx.footer, "rgba(255,255,255,0.55)")),
  ]);
};

const pastelSoft: Layout = (ctx, bg, dims) => {
  const p = ctx.primary;
  return el("div", { position: "relative", display: "flex", width: dims.width, height: dims.height, background: mix(p, "#ffffff", "12%") }, [
    softBlob(withAlpha(p, "30%"), 420, -120, -120),
    softBlob(withAlpha(p, "22%"), 320, dims.width - 200, dims.height - 260),
    frame(dims, 92, [
      el("div", { display: "flex", marginBottom: 26 }, [headerLabel(ctx.headerLabel, p, FONT_SCRIPT) ?? el("div", {})]),
      quoteCard(ctx, { bg: "#ffffff", quoteColor: "#33323a", markColor: p, quoteFont: FONT_SERIF, quoteSize: 46, starColor: p, shadow: "0 24px 60px rgba(0,0,0,0.10)" }),
      el("div", { display: "flex", marginTop: 32, paddingLeft: 8 }, [authorRow(ctx, "#33323a", "#8b8992", "#ffffff", p)]),
    ], footerRow(ctx.footer, withAlpha(p, "70%"))),
  ]);
};

const cornerFrame: Layout = (ctx, bg, dims) => {
  const p = ctx.primary;
  return el("div", { position: "relative", display: "flex", width: dims.width, height: dims.height }, [
    backgroundLayer(bg, p, dims, "light", "#fbfaf8"),
    cornerBracket(p, "tl"),
    cornerBracket(p, "br"),
    el("div", { position: "relative", display: "flex", flexDirection: "column", width: dims.width, height: dims.height, padding: 120, alignItems: "center", justifyContent: "center" }, [
      headerLabel(ctx.headerLabel, p, FONT_SANS, 4) ?? el("div", {}),
      ...(ctx.c.rating ? [el("div", { display: "flex", marginTop: 24 }, [starRow(ctx.c.rating, p, withAlpha(p, "18%"), 36)])] : []),
      el("div", { display: "flex", fontFamily: FONT_SERIF, fontSize: 54, fontWeight: 400, color: "#22201d", lineHeight: 1.32, textAlign: "center", marginTop: 28 }, ctx.quote),
      el("div", { display: "flex", flexDirection: "row", alignItems: "center", marginTop: 40 }, [avatarCircle(ctx, 88, p, p), el("div", { display: "flex", marginLeft: 20 }, [authorLines(ctx, "#22201d", "#8a857d")])]),
    ]),
  ]);
};

const sparkleAccent: Layout = (ctx, bg, dims) => {
  const p = ctx.primary;
  return el("div", { position: "relative", display: "flex", width: dims.width, height: dims.height }, [
    backgroundLayer(bg, p, dims, "dark", mix(p, "#12101c", "42%")),
    sparkleCluster(withAlpha(p, "85%"), 90, 96),
    sparkleCluster(withAlpha(p, "70%"), dims.width - 170, dims.height - 220),
    frame(dims, 100, [
      headerLabel(ctx.headerLabel, withAlpha(p, "92%"), FONT_SCRIPT) ?? el("div", {}),
      ...(ctx.c.rating ? [el("div", { display: "flex", marginTop: 18, marginBottom: 10 }, [starRow(ctx.c.rating, p, "rgba(255,255,255,0.16)", 36)])] : []),
      el("div", { display: "flex", fontFamily: FONT_SERIF, fontSize: 56, fontWeight: 400, color: "#f4f3fb", lineHeight: 1.3, marginTop: 16 }, ctx.quote),
      el("div", { display: "flex", marginTop: 40 }, [authorRow(ctx, "#f4f3fb", "rgba(255,255,255,0.72)", withAlpha(p, "80%"), p)]),
    ], footerRow(ctx.footer, "rgba(255,255,255,0.6)")),
  ]);
};

const splitPanel: Layout = (ctx, bg, dims) => {
  const p = ctx.primary;
  const panelH = Math.round(dims.height * 0.42);
  return el("div", { position: "relative", display: "flex", flexDirection: "column", width: dims.width, height: dims.height, background: "#ffffff" }, [
    el("div", { position: "relative", display: "flex", width: dims.width, height: panelH, alignItems: "center", justifyContent: "center" }, [
      backgroundLayer(bg, p, { width: dims.width, height: panelH }, "dark", mix(p, "#0a0a12", "45%")),
      el("div", { display: "flex", flexDirection: "column", alignItems: "center", padding: 60 }, [
        avatarCircle(ctx, 150, "#ffffff", p),
        el("div", { display: "flex", marginTop: 18 }, [headerLabel(ctx.headerLabel, "#ffffff", FONT_SCRIPT) ?? el("div", {})]),
      ]),
    ]),
    el("div", { display: "flex", flexDirection: "column", flex: 1, padding: 80, justifyContent: "center" }, [
      ...(ctx.c.rating ? [el("div", { display: "flex", marginBottom: 22 }, [starRow(ctx.c.rating, p, withAlpha(p, "18%"), 34)])] : []),
      el("div", { display: "flex", fontFamily: FONT_SERIF, fontSize: 48, fontWeight: 400, color: "#20232a", lineHeight: 1.3 }, ctx.quote),
      el("div", { display: "flex", marginTop: 30 }, [authorLines(ctx, "#20232a", "#7c8088")]),
    ]),
  ]);
};

const darkPremium: Layout = (ctx, bg, dims) => {
  const p = ctx.primary;
  return el("div", { position: "relative", display: "flex", width: dims.width, height: dims.height }, [
    backgroundLayer({ type: bg.type === "photo" ? "photo" : "texture", photoDataUri: bg.photoDataUri }, p, dims, "dark", "#0b0b10"),
    el("div", { display: "flex", position: "absolute", top: 84, right: 90, fontFamily: FONT_SERIF, fontSize: 150, fontWeight: 700, color: withAlpha(p, "40%"), height: 84, lineHeight: 1 }, LDQUO),
    frame(dims, 100, [
      headerLabel(ctx.headerLabel, withAlpha(p, "90%"), FONT_SANS, 4) ?? el("div", {}),
      el("div", { display: "flex", width: 80, height: 3, background: p, marginTop: 20, marginBottom: 30 }),
      ...(ctx.c.rating ? [el("div", { display: "flex", marginBottom: 24 }, [starRow(ctx.c.rating, p, "rgba(255,255,255,0.15)", 34)])] : []),
      el("div", { display: "flex", fontFamily: FONT_SERIF, fontSize: 56, fontWeight: 400, color: "#f5f5f4", lineHeight: 1.28 }, ctx.quote),
      el("div", { display: "flex", marginTop: 42 }, [authorRow(ctx, "#f5f5f4", withAlpha(p, "85%"), p, mix(p, "#0b0b10", "35%"))]),
    ], footerRow(ctx.footer, "rgba(255,255,255,0.55)")),
  ]);
};

const BUILDERS: Record<LayoutId, Layout> = {
  "editorial-serif": editorialSerif,
  "soft-quote-card": softQuoteCard,
  "spotlight-avatar": spotlightAvatar,
  "gold-luxe": goldLuxe,
  "bold-gradient": boldGradient,
  "minimal-neutral": minimalNeutral,
  "photo-feature": photoFeature,
  "social-proof-card": socialProofCard,
  "big-statement": bigStatement,
  "pastel-soft": pastelSoft,
  "corner-frame": cornerFrame,
  "sparkle-accent": sparkleAccent,
  "split-panel": splitPanel,
  "dark-premium": darkPremium,
};

// Layouts whose canvas is dark -> the watermark needs to be light.
const DARK_LAYOUTS = new Set<LayoutId>([
  "spotlight-avatar",
  "gold-luxe",
  "bold-gradient",
  "big-statement",
  "sparkle-accent",
  "dark-premium",
]);

export function buildLayout(spec: RenderSpec, dims: Dims): Node {
  const ctx: Ctx = {
    c: spec.content,
    primary: spec.colors.primary,
    quote: sanitize(spec.content.quote),
    headerLabel: spec.headerLabel,
    footer: spec.footer,
    width: dims.width,
    height: dims.height,
  };
  const inner = BUILDERS[spec.layout](ctx, spec.background, dims);
  const children: Node[] = [inner];
  if (spec.watermark) {
    children.push(watermarkBadge(spec.colors.primary, DARK_LAYOUTS.has(spec.layout)));
  }
  return el("div", { position: "relative", display: "flex", width: dims.width, height: dims.height }, children);
}
