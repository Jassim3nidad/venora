# Deployment

Venora is structured for GitHub source control, Vercel Next.js hosting, and a
hosted Supabase project. The repository contains no `.github` workflows,
`vercel.json`, or repository-verifiable Git-to-Vercel automation. Vercel project
settings, Git integration, production branch, deployed commit, Supabase link,
function settings, and provider dashboards must be checked externally.

## Environments

| Environment | Data/credentials                                            | Expectations                                                         |
| ----------- | ----------------------------------------------------------- | -------------------------------------------------------------------- |
| Local       | Local stack or dedicated hosted dev; test keys              | Safe resets only with `--local`; localhost callbacks                 |
| Test/CI     | Isolated fixtures/mocks; no production secrets              | Deterministic lint/type/test/docs/build                              |
| Preview     | Dedicated or carefully isolated backend/provider test mode  | Unique origin/callback/return URLs; no production customer data      |
| Staging     | Production-like isolated project, if provisioned externally | Migration/provider rehearsal and authenticated smoke tests           |
| Production  | Production Supabase/provider secrets                        | Explicit approval, least privilege, evidence, rollback/recovery plan |

## Vercel and GitHub

The web package builds with `pnpm --filter @venora/web build` from the workspace
and runs `next build --webpack`. A Vercel project may use repository root plus
that filtered command, or an `apps/web` root only if workspace dependencies and
lockfile resolution are verified. Do not copy outdated dashboard settings
without a preview build. Confirm install uses pnpm 9/lockfile, framework is
Next.js, output is `.next`, production branch is intended, and every environment
has the correct variables.

No automatic production deployment or preview behavior is claimed until the
Vercel/GitHub dashboards prove it. Record the source commit shown by Vercel and
compare it to approved Git history.

## Supabase and integrations

- Review and rehearse SQL; apply production migrations only through an approved
  privileged workflow. There is no verified automatic migration pipeline.
- Deploy Edge Functions and set secrets for the confirmed Supabase project;
  verify JWT/auth configuration per function in the dashboard/CLI.
- Verify four Storage buckets and policies rather than recreating them manually.
- Configure Supabase Auth site/redirect URLs for every intended origin.
- Register PayMongo HTTPS webhook and matching secret; configure test/live keys
  in the correct scope and validate return URLs.
- Verify Resend domain/sender, VAPID pair/subject, OpenRouter/OpenAI keys, and
  production app origin. Google Maps and direct Anthropic settings are not
  applicable to the current implementation.

## Safe release order

1. Confirm approved commit, clean diff, release scope, operator, and recovery
   plan; review migration and secret changes.
2. Run lint, type-check, tests, build, and all documentation validators locally
   or in a trusted CI environment.
3. Rehearse pending migrations against isolated data and verify generated types.
4. Push the reviewed application commit. Confirm the exact remote commit.
5. Apply only approved production migrations to the confirmed project and
   capture evidence.
6. Deploy/update Edge Functions, then set/verify server secrets without logging
   values.
7. Trigger or verify Vercel deployment through the externally configured flow.
8. Compare Vercel source commit and production URL to the approved release.
9. Run safe public/authenticated smoke tests using dedicated accounts.
10. Verify PayMongo webhook/test evidence as appropriate, Resend, push, Storage,
    analytics, and AI status.
11. Record release result, known warnings, dashboard checks, and follow-up.

Application-first versus database-first ordering can differ for a backwards-
compatible migration. Every release must be designed so old and new app versions
can coexist during rollout; destructive schema removal needs a later release.

## Rollback/recovery

Prefer redeploying a known-good application commit when schema remains backward
compatible. Database rollback is not automatic: use an approved forward repair
or restore plan. Do not reset production, delete migrations, rewrite history, or
rotate secrets without coordinated recovery. Follow the
[rollback runbook](runbooks/29-rollback-procedure.md) and
[unexpected commit runbook](runbooks/02-unexpected-production-commit.md).
