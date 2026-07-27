MANUAL STEPS TO DEPLOY TO VERCEL

1. Go to https://vercel.com
2. Login/signup
3. Click Add New -> Project
4. Select GitHub repo: [your-repo]
5. Project name: teamtestify
6. Add environment variables (see lists below - read the NOTES section
   first, the originally planned variable list had several inaccuracies
   that would have caused a broken deploy)
7. Click Deploy
8. Wait for deployment


ENVIRONMENT VARIABLES TO ADD IN VERCEL UI (Next.js / browser side)

These are the only variables the Next.js app itself reads via
process.env, confirmed by grepping src/ for each name.

NEXT_PUBLIC_CONVEX_URL=https://ideal-buffalo-440.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://ideal-buffalo-440.convex.site
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51TrdP0QfzDZz8igb0I1Q02adjvDaZf9wRxcrKKPo6zIsupDzpIeBjIpkjziBNptYxc0a5WOXSR8PcWZizsRPFFKI00PtZxE8Zr
NEXT_PUBLIC_SITE_URL=https://teamtestify.vercel.app
NEXT_PUBLIC_BETA_MODE=true
IMAGE_RENDER_SECRET=[same value as on the Convex deployment - see below,
                    do not hardcode the real value into this or any
                    other committed file]

IMAGE_RENDER_SECRET needs to be the exact same value as the one set on
the Convex deployment (see below) - it is one shared HMAC secret used
on both sides: convex/images.ts signs a token with it, and the Next.js
route src/app/api/testimonial-image/route.ts verifies that token with
it. If the two copies ever differ, image rendering breaks with an
invalid-token error.


VARIABLES THAT DO NOT GO IN VERCEL - THEY LIVE ON THE CONVEX DEPLOYMENT

Everything under convex/ runs on Convex's own servers, not on Vercel.
Vercel's environment variables are never visible to that code. These
were listed in the original plan as "add in Vercel" - that would not
have worked, since nothing in convex/ would ever see them there.

As of 2026-07-27, confirmed via `npx convex env list --deployment
ideal-buffalo-440`, already set on the new deployment:

  SITE_URL                    = https://teamtestify.vercel.app
  BETTER_AUTH_SECRET           freshly generated for this deployment
                               (not copied from the old one - rotation
                               already done, nothing further needed)
  STRIPE_SECRET_KEY            copied from the old deployment
  RESEND_API_KEY                copied from the old deployment
  GEMINI_API_KEY                copied from the old deployment
  IMAGE_RENDER_SECRET          copied from the old deployment (also
                               needed in Vercel with the identical
                               value, see above)

Still missing on ideal-buffalo-440 (present on the old polite-weasel-867
deployment but not yet copied over - add before the corresponding
feature is used in production):

  APP_URL                       required unconditionally by
                                convex/stripe.ts assertSameOrigin -
                                Stripe checkout AND the billing portal
                                both throw immediately without it. Not
                                hit yet since BETA_MODE hides the Pro
                                upgrade/manage-billing UI, but must be
                                set before beta ends.
  STRIPE_WEBHOOK_SECRET          Stripe generates this when you create
                                a webhook endpoint (in the Stripe
                                Dashboard, not Vercel) pointed at
                                https://ideal-buffalo-440.convex.site/stripe/webhook
                                - create that endpoint, then run
                                npx convex env set STRIPE_WEBHOOK_SECRET whsec_...
  STRIPE_PRO_MONTHLY_PRICE_ID    required by createCheckoutSession;
  STRIPE_PRO_YEARLY_PRICE_ID     throws if missing when checkout runs
  GROQ_API_KEY                   convex/lib/transcription.ts - video
                                testimonial transcription will fail
                                without it
  PEXELS_API_KEY                 convex/lib/pexels.ts - AI social-image
                                background photos will fail without it

Not set on either deployment (only relevant if Google sign-in should
work in production - email+password auth works without them):
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET

To update any Convex-side variable, run (not through the Vercel UI):
  npx convex env set VAR_NAME value --deployment ideal-buffalo-440

Note: ideal-buffalo-440 is itself typed "dev" by Convex (confirmed via
`npx convex env list` output: "on dev deployment ideal-buffalo-440"),
not a formal production deployment - it is a personal dev deployment
inside a separate, newly created Convex project (team: carlos-fiallos,
project: teamtestify-prod), distinct from the original webtestimonios
project (polite-weasel-867) used for local development. It is being
used as the de facto production backend for now. If a proper Convex
production deployment is created later for teamtestify-prod, all of
the above variables need to be set on it too - they do not carry over
automatically.


NOTES FROM INVESTIGATION (differences from the originally planned variable list)

1. CONVEX_DEPLOYMENT_URL is not a variable this codebase reads anywhere.
   The app actually reads two separate Convex URLs: NEXT_PUBLIC_CONVEX_URL
   (the .convex.cloud client endpoint) and NEXT_PUBLIC_CONVEX_SITE_URL
   (the .convex.site endpoint used by Better Auth). Both are listed above.

2. STRIPE_PUBLISHABLE_KEY (as originally named) would not reach the
   browser bundle. Next.js only exposes environment variables prefixed
   NEXT_PUBLIC_ to client-side code, and src/components/providers uses
   process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY specifically. Renamed
   accordingly above.

3. SITE_URL, STRIPE_SECRET_KEY, RESEND_API_KEY, IMAGE_RENDER_SECRET,
   GEMINI_API_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and
   BETTER_AUTH_SECRET were all listed in the original plan as "add in
   Vercel UI." Grepping the codebase shows every one of them (except
   IMAGE_RENDER_SECRET, which is shared) is read exclusively inside
   convex/ - meaning only the Convex deployment's own environment
   matters for them. Adding them in Vercel would silently do nothing.

4. Update 2026-07-27: the app has been switched to a new Convex
   project (team: carlos-fiallos, project: teamtestify-prod,
   deployment: ideal-buffalo-440) instead of the original
   webtestimonios/polite-weasel-867 used for local development.
   ideal-buffalo-440 is still typed "dev" by Convex itself, not a
   formal production deployment - functions/schema were pushed to it
   with `npx convex dev --once` (targeted via a temporary --env-file,
   since `npx convex deploy` targets a project's designated prod
   deployment, and this project doesn't have one yet). It is being
   used as the de facto production backend for now; see the missing-
   variables list above for what that decision still leaves open.

5. This document intentionally omits every actual secret value except
   the Stripe publishable key, which is the one value in this list
   Stripe designs to be public (safe in client bundles, unlike the
   secret key). Pull everything else directly from `npx convex env
   list` or the local .env.local file when configuring Vercel - don't
   hardcode secret values into this or any other committed file.


BUILD STATUS

npm run build was run locally on 2026-07-27 and completed successfully
(Next.js 16.2.10, Turbopack) - no errors, all 11 routes compiled
(static and dynamic mixed, including the newly-public /privacy-policy
and /terms-of-service pages). No changes were required to make it pass.
