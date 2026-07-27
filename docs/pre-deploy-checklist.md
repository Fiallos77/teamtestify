# Pre-deploy checklist

- [ ] Before production deploy, run:
      `npx convex env set SITE_URL https://[production-domain]`
      This ensures reset-password emails point to prod, not localhost
      (Better Auth's `baseURL` reads `SITE_URL` — see `convex/auth.ts`).
