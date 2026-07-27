# Performance & Optimization Audit

Investigation only — no code changed. Scope: Convex query cost, indexing,
HTTP caching, blocking operations, and SEO/render-mode for public pages.

## 1. Convex queries — `.collect()` inventory

Every non-test `.collect()` call in `convex/**/*.ts`, and whether it's
filtered at the DB level (via `.withIndex(...)`) or scanned broadly and
filtered in-memory afterward.

| File:line | Table | DB-level filter? | In-memory filter after? |
|---|---|---|---|
| `organizations.ts:39` | organizationMembers | ✅ `by_user` | no (≤1 row, capped by one-org-per-user) |
| `spaces.ts:35` | spaces | ✅ `by_org` | no |
| `spaces.ts:127` | testimonials (in `remove`) | ✅ `by_space` | no |
| `spaces.ts:138` | widgets (in `remove`) | ✅ `by_space` | no |
| `spaces.ts:143` | widgetEvents (in `remove`, per-widget loop) | ✅ `by_widget_and_time` | no |
| `widgets.ts:62` | widgets | ✅ `by_space` | no |
| `testimonials.ts:22` (`getOrgStats`) | testimonials | ✅ `by_org` | yes — 3x `.filter()` for pending/approved/video counts |
| `testimonials.ts:43` (`getSpaceStats`) | testimonials | ✅ `by_space` | yes — 2x `.filter()` |
| `testimonials.ts:63` (`getPendingCount`) | testimonials | ✅ `by_space_and_status` | no |
| `testimonials.ts:94,99` (`listBySpace`) | testimonials | ✅ `by_space[_and_status]` | no filter, but **entire index range collected then `.slice()`'d in JS for pagination** |
| `entitlements.ts:121` (`assertCanCreateSpace`) | spaces | ✅ `by_org` | no |
| `entitlements.ts:139` (`countApprovedTestimonials`) | testimonials | ✅ `by_org_and_status` (approved only) | no |
| `entitlements.ts:218` (`applyReUpgradeToPro`) | testimonials | ✅ `by_org` (**not** scoped to `downgradeHidden`) | yes — filters for `downgradeHidden` over the org's *entire* testimonial history |
| `planUsage.ts:22` | spaces | ✅ `by_org` | no |
| `planUsage.ts:27` | testimonials | ✅ `by_org` (**all statuses, all time**) | yes — filters for `approved && video` |
| `lib/widgetPayload.ts:46` (`selectWidgetTestimonials`) | testimonials | ✅ `by_space_and_status` (approved only) | yes — tag/rating/featured filter + sort + `.slice(0, maxItems)`, **all in JS after collecting the full approved set** |
| `storageCleanup.ts:13` | `_storage` (system table) | ❌ none | yes — full deployment-wide file list, then filtered by referenced-ids Set |
| `storageCleanup.ts:17` | testimonials | ❌ none | reads every org's entire testimonial table just to build a referenced-storage-id Set |
| `storageCleanup.ts:18` | spaces | ❌ none | same, for `space.branding.logoStorageId` |

### 5 most expensive queries (ranked)

1. **`convex/storageCleanup.ts:13,17,18`** — `cleanupOrphanedUploads`, run
   every 6h via `convex/crons.ts:6-10`. Three **unbounded, unscoped**
   full-table scans: all storage file metadata in the deployment, all
   testimonials across every org, all spaces across every org. No
   `.withIndex()`, no org/tenant boundary, no limit. Cost grows with the
   *entire* customer base's data, not any one tenant's, and re-runs every 6
   hours regardless.

2. **`convex/lib/widgetPayload.ts:43-53`** (`selectWidgetTestimonials`) —
   powers both the public "Wall of Love" embed (`embedPublic.getWidgetPayload`,
   unauthenticated, called by every visitor of every customer site that
   embeds a widget) and the owner's live widget preview. DB-filtered to
   `approved` via `by_space_and_status`, but then the *entire* approved set
   is loaded into memory before tag/rating/featured filtering, sorting, and
   `.slice(0, maxItems ?? 50)`. Pro is "unlimited published testimonials" —
   a space with thousands of approved testimonials pulls all of them on
   every embed render, only to keep ≤50. See also §3 — this path has no
   HTTP-level cache at all.

3. **`convex/planUsage.ts:24-27`** — `getPlanUsage`, called on every
   dashboard/Settings→Plan page load. Collects **every testimonial the org
   has ever received, in any status, across all time** (`by_org`, not
   scoped to status) just to count `approved && video`. Since testimonials
   are never deleted on downgrade (per project convention), this scan only
   grows over an account's lifetime — and it's on a hot, frequently-hit
   authenticated path.

4. **`convex/testimonials.ts:87-99`** (`listBySpace`) — the Inbox list.
   Correctly DB-filtered by space(+status), but Convex has no native offset
   cursor, so the handler collects the **entire matching index range**
   every call and paginates with `.slice()` in JS, and takes `total =
   rows.length` from that same full read. Cost is O(all matching rows),
   not O(page size), on every page turn.

5. **`convex/entitlements.ts:214-224`** (`applyReUpgradeToPro`) — runs on
   every Stripe `checkout.session.completed`/reactivation webhook. Collects
   **all** of an org's testimonials via `by_org` (no status/flag scoping —
   there's no index on `downgradeHidden`), filters in JS for the ones
   flagged `downgradeHidden`, then patches them with **sequential, non-batched
   `await`s** in a loop. Low frequency (webhook-triggered) but unbounded
   cost per call as testimonial history grows.

## 2. Indexing

### Indexes defined in `convex/schema.ts`

| Table | Indexes |
|---|---|
| `organizations` | *(none)* |
| `organizationMembers` | `by_org`, `by_user`, `by_org_and_user` |
| `userSettings` | `by_auth_user_id` |
| `spaces` | `by_org`, `by_slug` |
| `testimonials` | `by_space`, `by_space_and_status`, `by_org`, `by_org_and_status`, `by_space_status_featured` |
| `widgets` | `by_space`, `by_org` |
| `widgetEvents` | `by_widget_and_time` |
| `subscriptions` | `by_org`, `by_stripe_customer_id`, `by_stripe_subscription_id` |
| `stripeWebhookEvents` | `by_event_id` |
| `aiUsage` | `by_org_and_month` |

### Queries in `testimonials.ts` / `widgets.ts` lacking an index

None of the query functions in either file skip `.withIndex()` — every
`ctx.db.query("testimonials"/"widgets")` call in both files is index-scoped
(confirmed above). The gap isn't a *missing* index; it's an **unused
one**:

- **`by_space_status_featured`** (`schema.ts:134`, on `testimonials`:
  `spaceId` + `status` + `featured`) is defined but has **zero call
  sites** anywhere in `convex/`. It looks purpose-built for exactly the
  `onlyFeatured` branch of `matchesFilter()` in
  `lib/widgetPayload.ts:5-13`, but `selectWidgetTestimonials` never uses
  it — it still does the featured check as an in-memory `.filter()` after
  an index-2-field (`by_space_and_status`) collect. Net effect: the index
  costs write overhead on every testimonial insert/status-change without
  currently saving any read.

## 3. Cache headers

Searched `src/app/**` for `Cache-Control`, `revalidate`,
`export const dynamic`, `fetchCache`, `unstable_cache`.

**Only one hit in the entire tree:**
`src/app/api/testimonial-image/route.ts:97` — `"Cache-Control": "no-store"`
on the PNG-render endpoint (correct: each render is a unique,
tamper-signed, personalized image).

Nothing else in `src/app` sets any cache directive — no `revalidate`, no
ISR, no `fetchCache`. By contrast, the **legacy** Convex HTTP endpoint
`convex/http.ts:46-53` (`GET /embed/widget`) *does* set
`"Cache-Control": "public, s-maxage=60, stale-while-revalidate=300"`.

**What's effectively cached vs. not:**

- **Cached:** only the legacy `/embed/widget` HTTP JSON endpoint (CDN/edge
  cacheable, 60s + SWR).
- **Not cached:**
  - `src/app/(embed)/embed/[widgetId]/page.tsx` — the *current* iframe embed
    page (confirmed `"use client"`, first line). It calls
    `embedPublic.getWidgetPayload` as a live `useQuery` subscription, which
    bypasses HTTP caching entirely — every visitor on every customer site
    opens a fresh reactive subscription straight to Convex. The
    already-built 60s edge cache pattern from the legacy endpoint was never
    carried over to the page that actually serves embeds today.
  - `src/app/(public)/r/[slug]/page.tsx` — public collection/testimonial
    form, also client-rendered, no caching.
  - The marketing landing page (`src/app/page.tsx`) and dashboard routes —
    no explicit `revalidate`/`dynamic` export either way, so they're on
    Next.js defaults for their rendering mode, not a deliberate caching
    decision.

## 4. Blocking operations

`src/app/api` has exactly two routes: the Better-Auth catch-all
(`api/auth/[...all]/route.ts`, a pure passthrough — nothing to flag) and
`api/testimonial-image/route.ts`.

**`api/testimonial-image/route.ts` (POST)** does, all synchronously inside
the request handler before responding:
1. Verify an HMAC render token (`verifyRenderToken`).
2. `fetchAsDataUri()` — an outbound network fetch (with 1 retry) for the
   Pexels background photo, *if* `backgroundType === "photo"`.
3. A second `fetchAsDataUri()` for the author's avatar photo, if present.
4. `renderTestimonialImage()` — a native `sharp`-based PNG render (`export
   const runtime = "nodejs"` at line 22, confirming Node runtime for this
   reason), also wrapped in one retry.
5. Only then returns the PNG.

This means a client's HTTP request stays open for up to two external
network round-trips plus a native image render before it gets a response —
there's no queue/job pattern, no streaming, no early response. For a
one-shot "generate and download my image" action this is arguably the
expected UX (user is already waiting on a click), but it's worth flagging
as the one place in `src/app/api` doing real work (network + CPU-bound
render) fully synchronously with no fallback if either external fetch
hangs beyond its single retry.

**By contrast (noted for context, not an API route):** testimonial
submission's email notification is *already* properly decoupled from the
request path — `convex/public.ts:159` and `:225` both call
`ctx.scheduler.runAfter(0, internal.notifications.sendNewTestimonialEmail,
...)` rather than awaiting the email send inline, so a slow Resend call
never blocks (or fails) the visitor's submission response.

## 5. SEO

**`src/app/layout.tsx:27-30`** — root metadata is a single static object
(`title: "Testimonial Studio"`, generic description) with no
`openGraph`, no `twitter` card, no canonical URL. It applies to *every*
route that doesn't override it.

Only one other route overrides it: **`src/app/page.tsx:14-18`** (the
marketing landing page) — has its own real `title`/`description`, and is a
plain server component (no `"use client"`), so it's fully crawlable and
correctly titled. This is the one page in the app doing SEO right.

**Every public-facing tenant page is `"use client"` and inherits the
generic root metadata:**

- `src/app/(public)/r/[slug]/page.tsx` — line 1: `"use client"`. This is
  the actual page a business shares as their testimonial-collection link.
  Content (business name, headline, subheading) is fetched client-side via
  `useQuery(api.public.getSpaceBySlug, ...)` after hydration — there is no
  `generateMetadata`, and client components can't export one. Concretely:
  - Googlebot may eventually render the JS and index *some* content, but
    there's no per-page `<title>`/description for search results.
  - Link-unfurlers that don't execute JS (Slack, iMessage, most Twitter/X
    previews, Facebook's crawler in many cases) will only ever see the
    static root metadata — every single tenant's shared collection link
    unfurls as generic "Testimonial Studio — Collect and showcase customer
    testimonials," never the business's own name or headline.
- `src/app/(embed)/embed/[widgetId]/page.tsx` — also `"use client"` (line
  1). Same non-indexable/non-unfurl-able situation, though this one is
  normally loaded inside an `<iframe>` on a customer's own site, so it's
  lower-stakes for SEO specifically (search engines attribute content to
  the parent page, not the iframe) — flagged for completeness, not as a
  priority.

**Server-rendered but still generic:** `src/app/(public)/privacy-policy/page.tsx`
and `.../terms-of-service/page.tsx` are plain server components (no `"use
client"`) — crawlable — but neither exports its own `metadata`, so both
also show the site-wide generic title/description in search results
instead of "Privacy Policy — TeamTestify" / "Terms of Service —
TeamTestify".

---

*No files were modified as part of this audit.*
