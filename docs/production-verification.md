# Production Verification

Production verification confirms deployment identity before functional claims.
Use the `production` GitHub environment and an approved full commit SHA.

## Automated safe checks

`Deployment verification` confirms:

- the URL matches `PRODUCTION_BASE_URL`;
- Vercel reports the intended project and `READY` state;
- deployed Git SHA equals the approved SHA;
- public home, venues, login, robots, and sitemap respond;
- unauthenticated dashboard access redirects or is denied;
- `/api/debug` returns 404;
- checked responses contain no localhost or machine-local paths.
- public home, venue listing, and login pass Chromium smoke and serious/critical
  axe checks without using production credentials or mutations.

Every push to `main` starts this read-only job in the protected `production`
environment. It polls Vercel for up to ten minutes and requires the deployment
metadata SHA to equal the pushed Git SHA. Missing approval, configuration, or a
matching deployment produces a visible blocked/failed run.

## Manual checks

Use dedicated production smoke accounts only if approved. Verify release-
specific auth/RBAC, booking, payment test-mode boundaries, Storage, webhooks,
notifications, analytics, and AI without creating real transactions. Inspect
Vercel and Supabase logs for new errors. Never print secrets or customer data.

## Commit binding failure

If Vercel's SHA differs, do not approve the release. Follow the unexpected
commit runbook linked from [rollback](rollback.md), determine whether Git
integration queued another deployment, and redeploy the known-good approved
commit through Vercel's existing Git flow.

Production is not `PASS` until both automated identity checks and required
release-specific verification are complete.
