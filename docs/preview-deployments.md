# Preview Deployments

Vercel Git integration should create previews from pull requests. The repository
does not call `vercel deploy`; this avoids duplicate or conflicting deployment
authorities.

## Required Vercel settings

- Connect the intended GitHub repository and preserve `main` as production.
- Install with the locked pnpm version and build the workspace web application.
- Scope preview variables separately from production secrets.
- Use a dedicated staging Supabase project for authenticated preview tests.
- Register preview-compatible Supabase Auth redirects and provider return URLs.
- Keep PayMongo and other payment providers in test mode.

## Verification

Run `Deployment verification` with tier `preview`, the preview HTTPS URL, and the
full reviewed commit SHA. The workflow queries Vercel deployment metadata,
requires `READY`, verifies the Vercel project and commit, exercises safe routes,
checks the unauthenticated dashboard boundary, confirms `/api/debug` is absent,
scans responses for local-only paths, and runs three public Chromium/axe smoke
tests on home, venue listing, and login. Browser diagnostics upload only on
failure.

Preview verification is read-only. It does not prove authenticated E2E, RLS,
webhooks, email, push, or payment behavior. Run protected staging verification
for those behaviors.

If the preview points to production data, stop. Do not run mutation, account,
payment, Storage, or cross-tenant tests against it.
