# Release Checklist

## Before merge

- [ ] Scope, user impact, data impact, and rollback are documented.
- [ ] PR is current with `main`; no unexpected files or local paths.
- [ ] Required CI and security checks pass.
- [ ] At least 124 canonical Vitest tests pass.
- [ ] OpenAPI generation has no diff; coverage and semantic validation pass.
- [ ] Migration validator and generated database type contract pass.
- [ ] Preview deployment is bound to the reviewed SHA.
- [ ] Hosted checks ran on protected staging, or are explicitly `BLOCKED`.

## Before protected operations

- [ ] Exact full SHA and change ticket are recorded.
- [ ] Correct GitHub environment and Supabase project ref are confirmed.
- [ ] `database-plan` output is reviewed.
- [ ] Hosted history is reconciled for the upstream `068`-to-`0680` rename and
      duplicate version `071`.
- [ ] Migration `071_tighten_venue_media_storage_ownership.sql` is present where
      venue-media RLS verification is required.
- [ ] Edge Function name and existing/intended `verify_jwt` mode are verified.
- [ ] Required reviewer approved the environment run.

## Production

- [ ] Vercel shows `READY`, intended project, and approved source SHA.
- [ ] Home, venue listing, login, robots, and sitemap pass smoke checks.
- [ ] Protected dashboard does not render to an unauthenticated user.
- [ ] Debug route is absent; no localhost or machine paths are exposed.
- [ ] Release-specific booking/payment/auth/RBAC/Storage behavior is verified.
- [ ] Logs and provider dashboards show no new high-severity failures.
- [ ] Release manifest and workflow artifacts are retained.

## Closeout

- [ ] Local `main` and `origin/main` match the released SHA.
- [ ] Working tree is clean.
- [ ] Remaining blockers/risks have owners and deadlines.
- [ ] Rollback or forward-fix decision is documented if any check fails.
