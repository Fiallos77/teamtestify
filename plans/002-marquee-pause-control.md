# 002 — Add a keyboard/touch-reachable pause control to the marquee

- **Status**: TODO
- **Commit**: 7c69bce
- **Severity**: MEDIUM
- **Category**: Accessibility (AUDIT §6; WCAG 2.2.2 Pause/Stop/Hide)
- **Estimated scope**: 1 file (~25 lines)
- **Depends on**: plan `001` (uses the `animate` flag it introduces). Do `001` first.

## Problem

The Wall-of-Love marquee scrolls continuously for far longer than 5 seconds,
and the **only** way to pause it is a mouse hover:

```tsx
/* src/components/embed/testimonial-masonry-animated.tsx:127 (horizontal) and :185 (vertical) */
onMouseEnter={() => setPaused(true)}
onMouseLeave={() => setPaused(false)}
```

Keyboard-only and touch users have **no mechanism** to stop the motion —
WCAG 2.2.2 requires that auto-moving content lasting >5s be pausable by all
users. This is an embed running on customers' sites, so the gap ships to their
visitors.

## Target

A small, visible, keyboard-focusable **Pause / Play** toggle button pinned to
the top-right of the marquee viewport. It toggles a persistent
`userPaused` state that is independent of hover, so clicking Pause keeps it
paused even as the pointer moves. The effective play state becomes:

```
playState = (hoverPaused || userPaused) ? "paused" : "running"
```

The button shows a **Pause** icon while playing and a **Play** icon while
paused, with a matching `aria-label`. It is **hidden when `animate` is false**
(reduced-motion, from plan `001`) — there is nothing to pause in that mode.

Icons come from `lucide-react` (already a dependency): `Pause`, `Play`.

## Repo conventions to follow

- `lucide-react` icons are imported by name and sized with `className="size-4"`
  — see `testimonial-masonry-animated.tsx:4` (`import { Heart } from "lucide-react";`).
- Overlays inside this component are absolutely positioned within the
  `relative` viewport and marked `pointer-events-none` when non-interactive —
  see the edge-fade divs at `:157` and `:211`. The pause button IS interactive,
  so it must keep pointer events (do not add `pointer-events-none` to it).

## Steps

1. Extend the lucide import at `testimonial-masonry-animated.tsx:4`:
   ```tsx
   import { Heart, Pause, Play } from "lucide-react";
   ```

2. Rename the hover state to make intent explicit and add the user toggle.
   Current (:100): `const [paused, setPaused] = useState(false);`
   →
   ```tsx
   const [hoverPaused, setHoverPaused] = useState(false);
   const [userPaused, setUserPaused] = useState(false);
   ```

3. Replace the `playState` derivation. Current (:106):
   ```tsx
   const playState = paused ? "paused" : "running";
   ```
   →
   ```tsx
   const playState = hoverPaused || userPaused ? "paused" : "running";
   ```

4. Update both hover handler pairs to use `setHoverPaused`:
   - Horizontal (:127–128) and vertical (:185–186):
     ```tsx
     onMouseEnter={() => setHoverPaused(true)}
     onMouseLeave={() => setHoverPaused(false)}
     ```

5. Add a reusable button element and render it in **both** branches, just
   before the `<HeartOverlay … />` line (horizontal :156, vertical :210).
   Insert:
   ```tsx
   {animate && (
     <button
       type="button"
       onClick={() => setUserPaused((p) => !p)}
       aria-label={userPaused ? "Play testimonials" : "Pause testimonials"}
       className="absolute right-2 top-2 z-20 grid size-7 place-items-center rounded-full bg-background/80 text-foreground shadow-sm ring-1 ring-foreground/10 backdrop-blur-sm transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
     >
       {userPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
     </button>
   )}
   ```
   (`animate` is the flag added in plan `001`. If plan `001` is not yet
   applied, STOP — this plan depends on it.)

## Boundaries

- Do NOT touch any file other than `testimonial-masonry-animated.tsx`.
- Do NOT remove hover-to-pause — the button is additive; hover still works.
- Do NOT animate the icon swap or add a spinner; a plain instant icon change is
  correct here (AUDIT §1 — no decorative motion on a control that toggles
  constantly).
- Do NOT add dependencies.
- If `paused`/`playState` no longer look like the excerpts (e.g. plan `001`
  changed them differently), STOP and report.

## Verification

- **Mechanical**: `npx tsc --noEmit` exits 0; `npx vitest run` stays green.
- **Feel check**: open a wall/masonry widget preview with several testimonials:
  - A round Pause button is visible top-right of the wall.
  - **Click it**: motion stops and the icon becomes Play; move the mouse away —
    it **stays paused** (does not resume on mouse-leave). Click again: it
    resumes and the icon returns to Pause.
  - **Keyboard**: Tab to the button, press Enter/Space — it toggles; a visible
    focus ring shows on the button.
  - **Touch (or device emulation)**: tapping the button toggles pause with no
    reliance on hover.
  - With DevTools reduced-motion emulation on (plan `001`), the button is
    **absent** (nothing is moving).
- **Done when**: the marquee can be paused and resumed with keyboard and touch,
  and the paused state survives pointer movement.
