// The 14 layout ids, mirrored from src/lib/testimonial-image/types.ts (the
// render engine's source of truth). Convex functions live under convex/ and
// can't cleanly import the render engine (it pulls in satori/sharp), so this is
// a deliberate copy — imageLayouts.test.ts asserts the two lists stay in sync.
export const LAYOUT_IDS = [
  "editorial-serif",
  "soft-quote-card",
  "spotlight-avatar",
  "gold-luxe",
  "bold-gradient",
  "minimal-neutral",
  "photo-feature",
  "social-proof-card",
  "big-statement",
  "pastel-soft",
  "corner-frame",
  "sparkle-accent",
  "split-panel",
  "dark-premium",
] as const;

export type LayoutId = (typeof LAYOUT_IDS)[number];
export const LAYOUT_SET = new Set<string>(LAYOUT_IDS);

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
}

// Pick 3 distinct layouts at random, guaranteeing the result is not the exact
// same set as the org's previous generation. rng is injectable so the choice
// is deterministic in tests.
export function pickLayouts(
  previous: readonly string[] = [],
  rng: () => number = Math.random,
  all: readonly string[] = LAYOUT_IDS
): string[] {
  const shuffled = shuffle(all, rng);
  let pick = shuffled.slice(0, 3);
  if (previous.length === 3 && sameSet(pick, previous)) {
    // shuffled[3] isn't in the first three, so swapping it in can't reproduce
    // the previous set.
    pick = [shuffled[0], shuffled[1], shuffled[3]];
  }
  return pick;
}

export { sameSet };
