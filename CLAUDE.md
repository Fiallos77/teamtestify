@AGENTS.md

# TeamTestify — project context

TeamTestify is a testimonial-collection SaaS (collect → moderate → embed a
"Wall of Love"). A cheaper, self-serve alternative to testimonial.to / Senja,
aimed at freelancers, creators, and small service businesses.

## Stack
- **Next.js 16** (App Router). Per AGENTS.md, read `node_modules/next/dist/docs/`
  before writing Next code — the APIs differ from older versions.
- **Convex** — backend, DB, and functions in `convex/` (deployment `polite-weasel-867`).
- **Better Auth** — identity only. Orgs / members / multi-tenancy live in our own
  `organizations`, `organizationMembers`, `userSettings` tables (see `convex/lib/authz.ts`).
- **shadcn/ui** + Tailwind for UI.
- **Stripe** (test mode) — Pro checkout, customer portal, webhooks.
- **Gemini API** — model `gemini-2.5-flash`, called only through
  `convex/lib/aiProvider.ts` (`generateText()`) so swapping providers touches one file.
- **vitest** — `npx vitest run`. Config caps `maxForks: 2` (4-core / slow-filesystem
  dev box); if a run or dev server hangs, kill + restart rather than chasing it as a
  code bug.

## Plans
Free and Pro (USD 29/mo or 290/yr). The plan matrix is the source of truth in
`teamtestify-v2-spec.md`. All plan limits are enforced **server-side via
`convex/entitlements.ts` only** — never inline, never UI-only. Collection is never
blocked; limits apply to what gets published. No feature deletes user data on downgrade.

## Status
- **Done:** Phase 1 (security hardening), Phase 2 (entitlements + Stripe + downgrade),
  Phase 2.5 (landing page at `/`).
- **Pending:** Phase 4A AI request assistant (in progress), R2 video-storage migration
  (trigger in `docs/pre-launch.md`), Phase 4B AI social-image generator, v3 video clipping.

## Conventions
- **TDD**, one commit per task.
- Never hardcode secrets — read them from Convex env vars (`process.env.*`).
- **STOP for owner review before expanding scope** beyond the current task.
