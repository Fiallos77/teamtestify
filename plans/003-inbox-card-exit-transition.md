# 003 — Soften inbox card removal (exit transition on reject/delete)

- **Status**: TODO
- **Commit**: 7c69bce
- **Severity**: LOW (additive — "missed opportunity", AUDIT §8)
- **Category**: Missed opportunity / Interruptibility
- **Estimated scope**: 2 files (~30 lines) — 1 token in `globals.css`, 1 component edit
- **Depends on**: plan `001` for the `usePrefersReducedMotion` hook (`src/lib/use-prefers-reduced-motion.ts`). If that file does not exist yet, create it from plan `001`'s Target section first.

## Problem

In the space inbox, moderating a testimonial removes its card **instantly** and
the cards below **jump up** to fill the gap — a teleport with no explanation of
what happened.

`src/app/(dashboard)/dashboard/spaces/[spaceId]/page.tsx` — the list renders
one `<TestimonialCard>` per item:

```tsx
{result?.items.map((t) => (
  <TestimonialCard key={t._id} testimonial={t} />
))}
```

Reject and delete fire their mutations immediately; Convex reactivity drops the
item from the query result and React unmounts the card the same frame:

```tsx
/* reject — inside TestimonialCard */
onClick={() =>
  setStatus({ testimonialId: testimonial._id, status: "rejected" })
}
```

```tsx
/* delete — inside TestimonialCard */
onClick={() => remove({ testimonialId: testimonial._id })}
```

A brief exit (fade + collapse) would explain the removal instead of snapping.

## Scope decision (read before implementing)

- Animate the exit **only for Reject and Delete**. These mutations never fail
  for quota reasons, so it is safe to play the exit first and fire the mutation
  after.
- **Do NOT animate Approve.** Approve is gated by entitlements
  (`handleApprove` catches an error and renders `<ErrorWithUpgradeCta>`); the
  card must stay put if approval is rejected. Leave Approve exactly as-is.
- **No entrance animation.** Tabs and pagination re-render this list many times
  a day; animating every list render would violate AUDIT §1 (reduce motion on
  frequent interactions). Exit-on-moderation only.

## Target

A strong-ease-out collapse: on Reject/Delete the card's wrapper fades to
`opacity: 0`, slides `8px` right, and collapses its row height to zero over
**200ms** using a shared easing token, then the mutation fires. Under
`prefers-reduced-motion: reduce`, skip the animation entirely and remove the
item immediately (no movement).

New easing token in `src/app/globals.css`, inside the existing `@theme inline`
block (Tailwind v4 generates an `ease-out-strong` utility from it):

```css
--ease-out-strong: cubic-bezier(0.23, 1, 0.32, 1);
```

Wrapper markup around the existing `<Card>` (height collapse via the
`grid-template-rows: 1fr → 0fr` technique with an `overflow-hidden` child):

```tsx
<div
  data-leaving={leaving}
  className="grid grid-rows-[1fr] transition-all duration-200 ease-out-strong data-[leaving=true]:grid-rows-[0fr] data-[leaving=true]:opacity-0 data-[leaving=true]:translate-x-2 motion-reduce:transition-none"
>
  <div className="overflow-hidden">
    <Card>{/* …existing card contents… */}</Card>
  </div>
</div>
```

## Repo conventions to follow

- Theme tokens are declared in `src/app/globals.css` under `@theme inline`
  (see the `--radius-*` entries at the end of that block). Add
  `--ease-out-strong` there — do not create a new stylesheet.
- Reduced motion is detected with the hook from plan `001`:
  `import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";`
  (`src/lib/` flat-helper convention).
- `TestimonialCard` already holds local UI state with `useState`
  (`const [approveError, setApproveError] = useState<string | null>(null);`) —
  add the `leaving` state the same way.

## Steps

1. In `src/app/globals.css`, add one line inside the `@theme inline { … }`
   block (e.g. immediately after `--radius-4xl: …;`):
   ```css
   --ease-out-strong: cubic-bezier(0.23, 1, 0.32, 1);
   ```

2. In `src/app/(dashboard)/dashboard/spaces/[spaceId]/page.tsx`, add the hook
   import alongside the other imports at the top:
   ```tsx
   import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
   ```

3. Inside the `TestimonialCard` component, next to the existing
   `const [approveError, setApproveError] = useState<string | null>(null);`,
   add:
   ```tsx
   const [leaving, setLeaving] = useState(false);
   const reduceMotion = usePrefersReducedMotion();

   // Play the exit, then run the mutation. Reduced motion → remove at once.
   function animateOut(action: () => void) {
     if (reduceMotion) {
       action();
       return;
     }
     setLeaving(true);
     setTimeout(action, 200);
   }
   ```

4. Wrap the component's returned `<Card>…</Card>` in the two-div wrapper from
   the **Target** section. The `<Card>` and everything inside it stays
   unchanged; only the wrapper is added around it.

5. Route Reject through `animateOut`. Current:
   ```tsx
   onClick={() =>
     setStatus({ testimonialId: testimonial._id, status: "rejected" })
   }
   ```
   →
   ```tsx
   onClick={() =>
     animateOut(() =>
       setStatus({ testimonialId: testimonial._id, status: "rejected" })
     )
   }
   ```

6. Route Delete through `animateOut`. Current:
   ```tsx
   onClick={() => remove({ testimonialId: testimonial._id })}
   ```
   →
   ```tsx
   onClick={() => animateOut(() => remove({ testimonialId: testimonial._id }))}
   ```

7. Prevent double-firing during the exit: add `disabled={leaving}` to the
   Reject button and the Delete button (the two whose `onClick` now calls
   `animateOut`). Do **not** disable Approve.

## Boundaries

- Do NOT change `handleApprove` or the Approve button — Approve stays instant.
- Do NOT touch the parent `InboxPage`, the pagination controls, the sort
  select, or any Convex function.
- Do NOT add an entrance/mount animation.
- Do NOT add dependencies or a motion library.
- Keep the `key={t._id}` on the mapped card unchanged.
- If the Reject/Delete `onClick` handlers or the `<Card>` return no longer match
  the excerpts (drift since commit `7c69bce`), STOP and report.

## Verification

- **Mechanical**: `npx tsc --noEmit` exits 0; `npx vitest run` stays green
  (193 tests).
- **Feel check**: open `/dashboard/spaces/<id>` (the inbox) with several
  pending testimonials:
  - Click **Reject** on a card: it fades, drifts slightly right, and collapses
    its height over ~200ms; the cards below slide up smoothly rather than
    jumping. In DevTools → Animations, set speed to 10% and confirm the collapse
    is a smooth height change, not a snap (note: animating `grid-template-rows`
    needs Safari 16+; verify in Safari if that's a target).
  - Click **Delete**: same smooth exit.
  - Click **Approve**: the card leaves **instantly** (unchanged) — and if the
    org is over its published-testimonial limit, the card **stays** and shows
    the upgrade CTA (no exit animation fired).
  - Rapidly click Reject twice: the button is disabled after the first click;
    the mutation fires once.
  - DevTools → Rendering → **Emulate `prefers-reduced-motion: reduce`**: Reject
    and Delete remove the card **immediately** with no movement.
  - Reject the last card on a paginated page: the exit plays, then pagination
    reconciles (page may step back) without visual glitch.
- **Done when**: Reject and Delete animate out over 200ms and the list closes
  the gap smoothly; Approve is untouched; reduced motion removes instantly.
