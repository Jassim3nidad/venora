# CI Troubleshooting

## Repository CI

| Symptom                   | Check                                                     | Safe action                                                                       |
| ------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Lockfile install fails    | Node/pnpm versions and lockfile diff                      | Run pnpm 9.15 with frozen install locally; commit intended lockfile only          |
| Formatting fails          | Named files in Prettier output                            | Format only named changed files and review every diff                             |
| OpenAPI drift             | Generated JSON/YAML diff                                  | Run `pnpm docs:generate`; fix source/docs and commit both artifacts               |
| Migration validator fails | Duplicate/order/destructive/mutable-file message          | Add a new forward migration; use exact allowlist only after database-owner review |
| Test total below 124      | `artifacts/ci/test-summary.json`                          | Restore missing assertions/tests; do not lower threshold without review           |
| Build fails only in CI    | Missing build-safe public config or case-sensitive import | Reproduce in clean checkout; never add server secrets to PR build                 |
| Gitleaks fails            | Finding path/commit, not value                            | Revoke/rotate if real; remove safely and assess history                           |
| Edge static audit warns   | `artifacts/ci/edge-functions.json`                        | Keep Deno format/type/import status BLOCKED until legacy debt is fixed            |
| Edge deploy is blocked    | Selected function Deno format/type output                 | Fix that function in a focused commit; never bypass the strict gate               |

## Hosted verification

`BLOCKED` is expected until staging environment variables, secrets, reviewers,
fixtures, Vercel metadata access, and a deployed SHA are configured. Confirm the
app host is on `STAGING_ALLOWED_HOSTS`, differs from `PRODUCTION_BASE_URL`, and
the Supabase URL matches the staging ref.

If cross-tenant Storage verification fails, stop production migration. Confirm
migration 071 is applied, tenant accounts belong to different organizations,
paths use organization/venue IDs, and cleanup completed. Do not use service-role
success as proof user RLS works.

## GitHub and Vercel

If a workflow is absent after push, verify the YAML exists on default `main`,
Actions is enabled, and the workflow syntax validator passes. If deployment
binding fails, compare Vercel project, URL, Git source SHA, and approved commit.
Do not bypass the check with a shortened SHA or manual Vercel CLI deploy.

Re-run transient provider/network failures only after determining the failed
step is idempotent. Never blindly retry database apply, payment, webhook, or
Edge deployment mutations.
