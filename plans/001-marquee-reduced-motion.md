# 001 — Gate the Wall-of-Love marquee behind prefers-reduced-motion

- **Status**: DONE (implemented in b0126e5)
- **Commit**: 7c69bce
- **Severity**: HIGH
- **Category**: Accessibility (AUDIT §6)
- **Estimated scope**: 2 files (~40 lines) — 1 new lib hook, 1 component edit

## Problem

The embeddable "Wall of Love" widget auto-scrolls **infinitely** and spawns
floating hearts, with **no `prefers-reduced-motion` handling anywhere in the
codebase** (verified: the only `matchMedia` call in `src/` is for
`prefers-color-scheme`). This component is injected into customers' own
websites via the embed, so it will run for users who have explicitly asked
their OS to reduce motion — a vestibular-accessibility problem and a common
app-store / WCAG review flag.

Current code, `src/components/embed/testimonial-masonry-animated.tsx`:

```tsx
/* :22 — the animation is always applied, timing linear + infinite */
function track(
  name: string,
  durationSeconds: number,
  playState: "running" | "paused",
  delay = "0s",
  reverse = false
) {
  return {
    animationName: name,
    animationDuration: `${durationSeconds}s`,
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
    animationDirection: reverse ? "reverse" : "normal",
    animationPlayState: playState,
    animationDelay: delay,
  } as React.CSSProperties;
}
```

```tsx
/* :79 — hearts float up on an infinite spawn interval whenever showHeartAnimation is on */
animationName: "heart-float",
```

The only pause mechanism is `onMouseEnter`/`onMouseLeave` (mouse-hover only —
that gap is handled separately in plan `002`).

## Target

When `(prefers-reduced-motion: reduce)` is set, the widget must **not
auto-scroll and must not spawn hearts**. Instead it renders the testimonials
as a **static, manually scrollable** column/row (single copy, no duplicated
loop content, container `overflow` switched to `auto` so nothing is clipped).
When reduced motion is **off**, behaviour is exactly as today.

New hook, `src/lib/use-prefers-reduced-motion.ts`:

```ts
"use client";

import { useEffect, useState } from "react";

// SSR-safe: defaults to false on the server / first paint, then syncs to the
// user's OS setting and updates live if they change it.
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
```

In `testimonial-masonry-animated.tsx`, derive `const animate = !reduceMotion;`
and thread it through: no `track()` style, a single (un-duplicated) copy, an
`overflow-auto` container, and `HeartOverlay active={false}` whenever
`animate` is false.

## Repo conventions to follow

- Client hooks/helpers live flat in `src/lib/` (e.g. `src/lib/visitor-id.ts`).
  Place the new hook at `src/lib/use-prefers-reduced-motion.ts` and mark it
  `"use client"` — the consuming component is already a client component.
- Live media-query pattern already used in the repo:
  `src/app/(embed)/embed/[widgetId]/page.tsx:50` —
  `const mql = window.matchMedia("(prefers-color-scheme: dark)");` with an
  `addEventListener("change", …)` listener. Mirror it.
- This component deliberately uses **longhand** animation style props (see the
  comment at `testimonial-masonry-animated.tsx:18`). Do not introduce the
  `animation` shorthand.

## Steps

1. Create `src/lib/use-prefers-reduced-motion.ts` with the hook body from the
   **Target** section verbatim.

2. In `src/components/embed/testimonial-masonry-animated.tsx`, add the import
   near the other imports (top of file):
   ```tsx
   import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
   ```

3. Inside `TestimonialMasonryAnimated`, right after
   `const [paused, setPaused] = useState(false);` (:100), add:
   ```tsx
   const reduceMotion = usePrefersReducedMotion();
   const animate = !reduceMotion;
   ```

4. **Horizontal branch** (`if (direction === "horizontal")`, :123). 
   a. Change the outer container so it scrolls when static. Current (:124):
   ```tsx
   <div
     className="relative overflow-hidden"
     style={{ maxHeight }}
   ```
   →
   ```tsx
   <div
     className={`relative ${animate ? "overflow-hidden" : "overflow-x-auto"}`}
     style={{ maxHeight }}
   ```
   b. Only apply the marquee style when animating. Current (:135):
   ```tsx
   style={track(
     "marquee-horizontal",
     duration,
     playState,
     `-${(i * duration) / (rows + 1)}s`,
     style.reverseDirection
   )}
   ```
   → wrap in `animate ? track(...) : undefined`:
   ```tsx
   style={
     animate
       ? track(
           "marquee-horizontal",
           duration,
           playState,
           `-${(i * duration) / (rows + 1)}s`,
           style.reverseDirection
         )
       : undefined
   }
   ```
   c. Render one copy instead of two when static. Current (:143):
   ```tsx
   {[0, 1].map((copy) => (
     <div key={copy} className="flex w-max gap-4">
       {lane.map((t) => (
         <div key={`${copy}-${t.id}`} className="w-72 shrink-0">
           {card(t, `${copy}-${t.id}`)}
         </div>
       ))}
     </div>
   ))}
   ```
   → change `{[0, 1].map(` to `{(animate ? [0, 1] : [0]).map(`.

5. **Vertical branch** (the `return` at :181). Apply the same three changes:
   a. Outer container (:182): `className="relative overflow-hidden"` →
   ```tsx
   className={`relative ${animate ? "overflow-hidden" : "overflow-y-auto"}`}
   ```
   b. Track style (:195): wrap the `track("marquee-vertical", …)` call in
   `animate ? track(…) : undefined` exactly as in step 4b.
   c. Duplication (:203): `{[0, 1].map((copy) =>` →
   `{(animate ? [0, 1] : [0]).map((copy) =>`.

6. Disable the heart overlay under reduced motion — **both** call sites:
   - Horizontal (:156) and vertical (:210):
     `<HeartOverlay active={!!style.showHeartAnimation} />` →
     `<HeartOverlay active={!!style.showHeartAnimation && animate} />`

## Boundaries

- Do NOT touch any file other than the new hook and
  `testimonial-masonry-animated.tsx`.
- Do NOT change the marquee's speed, direction, edge-fade gradients, or the
  `heart-float` / `marquee-*` keyframes in `globals.css`.
- Do NOT remove the hover pause (`onMouseEnter`/`Leave`) — that's plan `002`.
- Do NOT add dependencies.
- If the component's structure has drifted from the excerpts above (line
  numbers or JSX differ materially), STOP and report rather than guessing.

## Verification

- **Mechanical**: `npx tsc --noEmit` exits 0. `npx vitest run` stays green
  (193 tests at this commit).
- **Feel check**: open a widget preview
  (`/dashboard/spaces/<id>/widgets/<widgetId>` or the embed route) with a
  wall/masonry widget that has several testimonials:
  - Default (no reduced motion): it scrolls exactly as before; hover still
    pauses; hearts appear if the widget has `showHeartAnimation`.
  - In DevTools → Rendering → **Emulate `prefers-reduced-motion: reduce`**,
    reload: the wall is **motionless**, shows each testimonial **once** (no
    duplicated copies), you can **scroll it by hand** (wheel/trackpad/touch),
    and **no hearts** spawn.
  - Toggle the emulation back off and reload: motion returns.
- **Done when**: with reduced-motion emulation on, nothing moves on its own and
  all testimonials are reachable by manual scroll; with it off, behaviour is
  unchanged.
