# TeamTestify v2 Spec Audit (read-only)

Audited `teamtestify-v2-spec.md` against the current codebase state. No code was changed as part of this audit. Statuses: **IMPLEMENTED** / **PARTIAL** / **MISSING** / **CONFLICTS**. Missing Phase 2–4 items are expected (planned work, not defects) unless flagged otherwise.

## Global Constraints

| Requirement | Status | Files | Notes |
|---|---|---|---|
| Plan limits enforced server-side in Convex, never UI-only | MISSING (planned) | — | No plan/entitlement enforcement exists anywhere yet. Phase 2 work, correctly not started. |
| Single source of truth `convex/entitlements.ts` | MISSING (planned) | — | File does not exist. |
| `organizations` schema has vestigial `planTier` / `planLimits` fields | CONFLICTS | `convex/schema.ts:9-16` | Pre-dates the spec's entitlements design and is unused by any query/mutation (`grep` for `planTier`/`planLimits` only matches the schema definition). Risk: someone could wire ad-hoc plan checks against these fields instead of building the spec's single `entitlements.ts` module. Worth deciding explicitly whether to repurpose or delete before Phase 2 starts. |
| Collection never blocked by plan | IMPLEMENTED (trivially) | `convex/public.ts` | No plan gating exists at all yet, so collection is (currently) never blocked — consistent with the constraint, but only because nothing is built, not because it was deliberately designed this way. |
| No silent data deletion on downgrade | N/A (planned) | — | No downgrade logic exists yet (Phase 2). |

## Plan Matrix (Stripe products / gating)

All rows MISSING — expected, this is Phase 2/4 scope not yet started. No `subscriptions` table in `convex/schema.ts`, no Stripe SDK in `package.json`, no pricing/billing UI under `src/app`. Recorded here only for completeness, not as a defect.

## Phase 1 — Security hardening

### 1.1 Rate-limit and validate `generateUploadUrl`

| Requirement | Status | Files | Diff from spec |
|---|---|---|---|
| `@convex-dev/rate-limiter` component added | MISSING | `package.json`, `convex/convex.config.ts` | Dependency not present in `package.json`; `convex.config.ts` only registers `betterAuth` (`convex/convex.config.ts:1-8`). |
| Per-visitor token bucket (5/hour) + per-space cap (50/day) | MISSING | `convex/public.ts:30-35` | `generateUploadUrl` takes **no arguments at all** (`args: {}`) — it doesn't even receive a `spaceId` or visitor identifier, so neither limit is structurally possible yet without an API signature change. |
| Content-type allowlist + max size validation after upload, delete-on-failure | MISSING | `convex/public.ts:95-138` | `submitVideoTestimonial` stores whatever `storageId`/`mimeType`/`durationSeconds` the client claims with zero server-side verification against the actual stored blob. No size or type check exists anywhere in `convex/public.ts` or `convex/lib/storage.ts`. |
| Reject `generateUploadUrl` for spaces that don't exist or are disabled | MISSING | `convex/public.ts:30-35` | Same root cause as above — the mutation isn't scoped to a space at all, so there's nothing to check `isActive` against. Note `spaces.isActive` (`convex/schema.ts:62`) is the existing field that would represent "disabled." |

### 1.2 Validate `event.origin` in `embed.js`

| Requirement | Status | Files | Diff from spec |
|---|---|---|---|
| `postMessage` listener checks `event.origin` against app origin before use | MISSING | `public/embed.js:23-32` | The `window.addEventListener("message", ...)` handler only checks `data.source` and `data.widgetId`, never `event.origin`. Any page (or any other iframe) can post a fake `{source: "testimonial-widget-resize", widgetId, height}` message and resize the iframe on the host page. |
| Iframe→parent messages use explicit `targetOrigin`; treat payload as untrusted | PARTIAL | `src/app/(embed)/embed/[widgetId]/page.tsx:60-64` | `window.parent.postMessage(..., "*")` — wildcard target origin, not explicit. Note: the embed iframe is intentionally droppable on *any* customer's domain, which the spec's own host-app doesn't control or know in advance, so a fully explicit `targetOrigin` may not be achievable here the way it is for the *listener* side (1.2's first bullet, where the app's own origin is fixed and known). Worth a product decision on how far to push this bullet vs. accepting `"*"` on the outbound leg while still fixing the inbound `event.origin` check, which is the actual exploitable gap. |

### 1.3 Escape `spaceName` in emails

| Requirement | Status | Files | Diff from spec |
|---|---|---|---|
| Shared HTML-escape helper applied to all user-supplied strings in email templates | MISSING | `convex/notifications.ts:32-33` | `spaceName` is interpolated directly into both the HTML body and the subject line with no escaping helper anywhere in the repo (no `escapeHtml`/similar found under `convex/` or `src/lib/`). |
| Coverage: `spaceName`, org name, submitter name, testimonial excerpts | PARTIAL (scope narrower than spec assumes) | `convex/notifications.ts`, `convex/organizations.ts:106-116` | The only email that exists today (`sendNewTestimonialEmail`) interpolates just `spaceName` — org name, submitter name, and testimonial excerpts aren't in any email template yet (`getNotificationContext` only returns `notificationEmail` and `spaceName`). So today there's exactly one unescaped injection point, not four; the other three will need the same treatment if/when those fields are added to this or future templates. |
| Subject line newline-stripping (header injection) | MISSING | `convex/notifications.ts:32` | Subject is built with a raw template literal; nothing strips `\r`/`\n` from `spaceName` before it lands in `subject`. |

### 1.4 Quick pass

| Requirement | Status | Files | Notes |
|---|---|---|---|
| All Convex mutations touching org data check membership via Better Auth session | IMPLEMENTED | `convex/lib/authz.ts:16-41`, used consistently in `convex/organizations.ts`, `convex/spaces.ts`, `convex/testimonials.ts`, `convex/widgets.ts` | Every mutation that touches org-scoped data goes through `requireOrgContext` (throws on unauthenticated / no active org) plus one of `requireSpaceInOrg` / `requireTestimonialInOrg` / `requireWidgetInOrg`, which re-derive ownership from the org on every call rather than trusting client-supplied IDs. This matches the pattern already noted fixed in the 2026-07-09 manual review (`getVideoUrl` IDOR). No new gaps found in this pass. |
| Embed route serves only approved testimonials for the given widget | IMPLEMENTED | `convex/lib/widgetPayload.ts:37-44` (single widget), `:53-58` (wall widget), used by both `convex/embedPublic.ts` (new iframe route) and `convex/embed.ts` → `convex/http.ts` (legacy `/embed/widget` route) | Both the "single" and "wall" branches of `buildWidgetPayload` explicitly filter/check `status === "approved"` before returning testimonial data, and unpublished widgets (`!widget.isPublished`) return `null` outright. Shared code path means the legacy HTTP route gets the same guarantee for free. |

**Phase 1 summary:** 1.4 is solid — the org-membership authz layer and the approved-only embed filter are both correctly implemented and don't need changes. 1.1, 1.2 (listener side), and 1.3 are the real gaps and match what the 2026-07-09 manual security review already flagged as open items; this audit confirms none of them have been fixed yet and adds the specific line-level detail (e.g., `generateUploadUrl` has no arguments at all, so rate-limiting/space-scoping needs an API signature change, not just a wrapper).

## Phase 2 — Stripe + plan limits

All MISSING — planned, not started. No `subscriptions` table, no `convex/entitlements.ts`, no Stripe webhook route in `convex/http.ts`, no pricing/billing UI. Confirmed via `grep` for `stripe`/`Stripe`/`entitlements`/`subscriptions` across `*.ts` — zero matches outside the spec file itself.

## Phase 3 — Cloudflare R2 for video

MISSING — planned, not started, but the seam is already in place: `convex/lib/storage.ts` defines a `StorageAdapter` interface and `getActiveStorageAdapter()` indirection specifically so an `r2StorageAdapter` can be added later without touching call sites, and `testimonials.videoStorage.provider` in `convex/schema.ts:89` already accepts `"convex" | "r2"` so both can coexist during migration. This matches the spec's Phase 3 design intent even though R2 itself isn't wired up.

One relevant gap that will carry into Phase 3: video duration is only enforced client-side today (`MAX_SECONDS = 180` in `src/components/public/video-recorder.tsx:6`, flat 3 minutes for everyone, no free/pro distinction since entitlements don't exist yet) and never checked server-side in `submitVideoTestimonial` — the spec's Phase 3 line "reject oversize server-side" implies this needs to exist by then; today `durationSeconds` is trusted client input.

## Phase 4 — AI repurposing

MISSING — planned, not started. No `aiUsage` table, no AI generation code, no Anthropic API usage found under `src/` or `convex/`.

## Schema naming vs. spec assumptions

| Spec assumption | Current state | Notes |
|---|---|---|
| `convex/entitlements.ts` as single gating module | Does not exist | Confirmed above. |
| `subscriptions` table shape `{organizationId, stripeCustomerId, stripeSubscriptionId, plan, status, currentPeriodEnd}` | Does not exist | No conflicting prior art to reconcile — clean slate for Phase 2. |
| Spaces have a "disabled" concept | `spaces.isActive: v.boolean()` (`convex/schema.ts:62`) | Naming differs (`isActive` vs. spec's "disabled") but is functionally the same boolean, just inverted. Fine to reuse as-is for the Phase 1.1 space-active check once `generateUploadUrl` takes a `spaceId`. |
| Product name "TeamTestify" | `package.json` name is `"webtestimonios"`; outbound emails send `from: "Testimonial Studio <onboarding@resend.dev>"` (`convex/notifications.ts:30`) | Three different names in play (WebTestimonios / TeamTestify / Testimonial Studio) across repo metadata, spec, and the one live email template. Not a security issue, but worth resolving before Phase 1.3's email work or Phase 2's billing/receipt copy, so escaping fixes don't get built against a from-name that's about to change anyway. |

---

## Corrections, ordered by risk

1. **`generateUploadUrl` has zero server-side controls** (`convex/public.ts:30-35`) — no auth, no rate limit, no space scoping, no content-type/size validation, and the returned storage id never has to attach to a real testimonial. This is the highest-risk open item: unauthenticated storage-cost DoS / free file hosting under the app's domain, previously flagged in the 2026-07-09 review and confirmed still open. Fixing it requires an API shape change (add `spaceId`/visitor-identifier args), not just wrapping the existing call.
2. **`embed.js` trusts any `postMessage` sender** (`public/embed.js:23-32`) — missing `event.origin` check means any page can drive the iframe's rendered height via a forged message. Low blast radius (CSS-only) but a one-line fix (`if (event.origin !== origin) return;` using the `origin` already captured at `public/embed.js:8`).
3. **Unescaped `spaceName` in email HTML and subject** (`convex/notifications.ts:32-33`) — stored XSS-in-email and header-injection risk if an org name/space name ever contains `<script>` or a newline. Low severity today (space names are set by authenticated org members, not anonymous visitors) but cheap to fix with a shared escape helper before Phase 2 adds more email templates (receipts, dunning) that would otherwise repeat the same gap.
4. **No server-side video size/type/duration enforcement** (`convex/public.ts:95-138`, `src/components/public/video-recorder.tsx:6`) — currently trusts client-supplied `mimeType`/`durationSeconds` entirely; overlaps with item 1 but is worth calling out separately since it's needed regardless of whether the rate-limiter lands first.
5. **`organizations.planTier`/`planLimits` dead schema fields** (`convex/schema.ts:9-16`) — not a vulnerability, but a design-drift risk: decide whether to delete or fold into the upcoming `convex/entitlements.ts` before Phase 2 work starts, so gating logic doesn't end up split across two competing mechanisms.
6. **Product naming inconsistency** (WebTestimonios / TeamTestify / "Testimonial Studio") — cosmetic, but touches the same email template being fixed in item 3, so worth deciding the canonical name first.

No code changes were made. Stopping here for review/approval before any implementation work begins.
