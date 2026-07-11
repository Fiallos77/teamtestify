# TeamTestify v2 Specification

> **For Claude Code:** This is a product specification, not an implementation plan. Before writing code, inspect the actual repo and convert each phase into a detailed implementation plan (if the superpowers plugin is installed, use the `writing-plans` skill, then execute task-by-task with TDD). Phases must be executed strictly in order: Phase 1 → 2 → 3 → 4. Do not start Phase 2 until Phase 1 is verified.

**Goal:** Turn the working v1 (collection → moderation → widgets → embed) into a monetized product with a Free and a Pro plan, closing the known security gaps first.

**Current stack:** Next.js 16 (App Router), Convex (backend/DB), Better Auth (organizations, organizationMembers, userSettings), shadcn/ui. Not yet built: R2, Stripe, widget analytics UI.

**Initial target customer:** Freelancers, creators, and small service businesses buying self-serve. Agencies are explicitly out of scope for v2 (future Agency plan).

## Global Constraints

- Base currency USD. Stripe Checkout with adaptive/local currency display enabled. Stripe Tax enabled (handles Australian GST if/when the business registers).
- All plan limits must be enforced server-side in Convex, never only in the UI.
- A single source of truth for entitlements: one module (e.g., `convex/entitlements.ts`) that every mutation/query consults. No plan checks scattered inline.
- Collection is never blocked on any plan. Limits apply to what can be PUBLISHED/approved, not to what customers can submit.
- No feature may silently delete user data on downgrade. Over-limit testimonials become hidden/unpublished, not deleted.

---

## Plan Matrix (source of truth for Stripe products and gating)

| Capability | Free | Pro (USD 29/mo or 290/yr) |
|---|---|---|
| Spaces | 1 | 5 |
| Testimonials collected | Unlimited | Unlimited |
| Testimonials published | 15 total | Unlimited |
| Video testimonials published | 2 | Unlimited |
| Max video length | 2 min | 3 min |
| Widget types (Wall of Love, Carousel) | All | All |
| "Powered by TeamTestify" badge on widgets | Yes, not removable | Removable |
| Custom domain for collection page | No | Yes |
| Rich snippets (JSON-LD Review/AggregateRating in embed) | No | Yes |
| AI repurposing (social images, summaries, case study drafts) | No | 100 generations/mo |
| Team members per organization | 1 | 3 |
| Imports (Google, X/Twitter, etc.) | No | Yes (later milestone, not v2-blocking) |

Downgrade behavior: when Pro lapses, keep the 15 most recently published testimonials visible (max 2 video), unpublish the rest, re-enable badge, disable custom domain and AI. Store enough state to restore instantly on re-upgrade.

---

## Phase 1 — Security hardening (BLOCKER for everything else)

Close all three known gaps plus a quick OWASP pass. If the user's skill `seguridad-web-para-sitios-con-datos-de-usuario` is available locally, run it as the review checklist at the end of this phase.

### 1.1 Rate-limit and validate `generateUploadUrl`
- Add `@convex-dev/rate-limiter` component.
- Limits: token bucket per anonymous visitor identifier (cookie/fingerprint passed from the public page) of 5 upload URLs per hour, AND a per-space cap of 50 upload URLs per day. Both configurable constants.
- The mutation that persists the uploaded file must validate after upload: content type allowlist (`video/webm`, `video/mp4`, `image/jpeg`, `image/png`), max size (200 MB video, 5 MB image). If validation fails, delete the stored file immediately and reject.
- Reject `generateUploadUrl` calls for spaces that do not exist or are disabled.

### 1.2 Validate `event.origin` in `embed.js`
- All `postMessage` listeners in `embed.js` must check `event.origin` against the app origin (env-configured, e.g., `https://app.teamtestify.com`) before processing resize or interaction messages. Ignore silently otherwise.
- Messages sent from the iframe to the parent must specify an explicit `targetOrigin` where feasible, and message payloads must be treated as untrusted (validate shape before use).

### 1.3 Escape `spaceName` in emails
- Add a shared HTML-escape helper and apply it to every user-supplied string interpolated into email templates (`spaceName`, org name, submitter name, testimonial excerpts). Cover both HTML and subject lines (strip newlines from subjects to prevent header issues).

### 1.4 Quick pass
- Verify all Convex mutations that touch org data check membership via Better Auth session (no IDOR via widgetId/spaceId guessing where it matters; public read endpoints must only expose approved testimonials).
- Verify the embed route only serves approved testimonials for the given widget.

Exit criteria: manual abuse test of the public page (scripted 20 upload attempts → blocked), postMessage from a hostile page ignored, email with `<script>` in space name renders escaped.

## Phase 2 — Stripe + plan limits

- Products: `pro_monthly` (USD 29), `pro_yearly` (USD 290). Stripe Checkout for purchase, Stripe Customer Portal for cancel/update card. Stripe Tax on.
- Convex table `subscriptions`: `{ organizationId, stripeCustomerId, stripeSubscriptionId, plan: "free" | "pro", status, currentPeriodEnd }`. Free is the absence of an active Pro subscription; default everything to free.
- Webhook endpoint (Next.js route or Convex http action) handling: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Verify signature. Idempotent handlers.
- `convex/entitlements.ts`: exports `getEntitlements(organizationId)` returning the plan matrix values, and guard helpers like `assertCanPublish(orgId)`, `assertCanCreateSpace(orgId)`, `assertCanRemoveBranding(orgId)`. Every relevant mutation calls these.
- UI: pricing page, upgrade CTA on every limit hit (publish blocked at 16th, 3rd video, 2nd space), billing settings page linking to Customer Portal.
- Apply downgrade behavior exactly as defined in the plan matrix section.

Exit criteria: test-mode purchase upgrades entitlements live, cancellation downgrades at period end, limits enforced server-side (attempt via direct mutation call, not just UI).

## Phase 3 — Cloudflare R2 for video

- Move video storage from Convex storage to R2 (S3-compatible presigned uploads). Keep Convex for metadata.
- Presigned PUT with enforced `Content-Length` range and content-type conditions matching Phase 1 allowlist. Same rate limits apply to presign issuance.
- Serve via R2 public bucket behind Cloudflare CDN domain. Store `r2Key` on the testimonial document. Migration script for existing Convex-stored videos (copy → verify → switch URL → delete).
- Enforce max video duration client-side at recording (2 min free / 3 min pro from entitlements) and reject oversize server-side.

## Phase 4 — AI assist (differentiator)

Two features. **Feature A ships this phase (4A); Feature B is the next session (4B).**
Both are metered, not Pro-gated: every plan gets a monthly quota (see Quotas below).

### Feature A — AI request assistant (Phase 4A)

The owner writes **one sentence describing their business** (stored on the space).
From that, the AI generates:

1. An **outreach message** to send to customers — email and WhatsApp variants — with
   the space's public collection link included.
2. **3 industry-tailored guide questions**, shown on the public collection page to help
   the customer write/record. These are **owner-editable** (they land in the space's
   guided prompts, which already render on the public page and are editable in settings).
3. A **follow-up reminder message** for customers who haven't responded.

Output language matches the language the owner wrote the description in. Each generated
text has a **copy button**. The AI provider is abstracted behind a single internal module
(`convex/lib/aiProvider.ts`, exposing `generateText()`) so swapping providers later
touches one file. Model: Google Gemini `gemini-2.5-flash`, key from `GEMINI_API_KEY`
(Convex env, never hardcoded).

### Feature B — Social image generator (Phase 4B, next session)

Testimonial → branded, shareable social image. A library of **8 code-rendered layouts**:
split photo/color, giant quote, elegant neutral, vibrant solid, authentic screenshot
style (with handle), before/after, CTA footer, dark premium. The AI picks the **headline
hook**, the **layout**, and the **brand colors**. Background source priority:
**client photo > video frame (selected via transcription, Whisper) > brand color blocks**.
Exports at **1080×1080, 1080×1350, and 1080×1920**.

### Quotas (replace the old Pro-only boolean)

Metered in an `aiUsage` table (`organizationId`, `month`, counts **by feature**), read
against `convex/entitlements.ts`:

- **Free:** 3 image gens + 1 request gen per month (separate per-feature caps), with a
  "Hecho con TeamTestify" watermark on generated images.
- **Pro:** 100 **combined** gens per month (request + image share one pool), no watermark.
- A **third configurable tier value is reserved** for a future plan.

Every AI call **increments usage first and fails closed at the cap** (over-limit calls are
rejected before the provider is invoked). **Remaining credits are visible in the UI.**

## Out of scope for v2
- Agency plan, imports from review platforms, widget analytics UI, NPS/surveys, niche verticalization. Record ideas, do not build.
