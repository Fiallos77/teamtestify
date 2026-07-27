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

NEXT_PUBLIC_CONVEX_URL=https://polite-weasel-867.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://polite-weasel-867.convex.site
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

Confirmed already set on the current Convex deployment (dev:polite-weasel-867)
via `npx convex env list`:

  APP_URL                     (currently http://localhost:3000 - MUST be
                               updated to the real production URL before
                               launch, see NOTES)
  SITE_URL                    (currently http://localhost:3000 - MUST be
                               updated to the real production URL before
                               launch, see NOTES)
  BETTER_AUTH_SECRET           (rotate before any public/production use -
                               already flagged as pending in docs/pre-launch.md)
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  STRIPE_PRO_MONTHLY_PRICE_ID
  STRIPE_PRO_YEARLY_PRICE_ID
  RESEND_API_KEY
  GEMINI_API_KEY
  IMAGE_RENDER_SECRET          (also needed in Vercel, see above)
  GROQ_API_KEY                 (convex/lib/transcription.ts - Whisper
                               audio transcription for video testimonials)
  PEXELS_API_KEY                (convex/lib/pexels.ts - contextual
                               background photos for the AI social-image
                               feature)

Not currently set on Convex (only relevant if Google sign-in should work
in production - email+password auth works without them):
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET

To update any Convex-side variable, run (not through the Vercel UI):
  npx convex env set VAR_NAME value

Before production deploy, at minimum run:
  npx convex env set SITE_URL https://[your-real-production-domain]
  npx convex env set APP_URL https://[your-real-production-domain]

Skipping this step means: Stripe checkout/billing-portal return-URL
validation (convex/stripe.ts assertSameOrigin) will reject every
attempt once the app is live on a real domain, and password-reset
emails (Better Auth) will link back to localhost instead of the live
site.


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

4. Only a dev Convex deployment exists for this project
   (dev:polite-weasel-867 - confirmed via `npx convex deployments`,
   no prod deployment has been created). Decide, before deploying to
   Vercel, whether production should point at this same dev deployment
   or a dedicated Convex production deployment created with
   `npx convex deploy`. If a separate prod deployment is created, all
   of the Convex-side variables above need to be set on it too - they
   are not shared between dev and prod deployments.

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
