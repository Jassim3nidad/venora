# Testing and Validation

At the pre-documentation application baseline
`299243562647e3df6a6a558ce0190bc1b40c1965`, lint had zero errors (hundreds of
non-blocking warnings), type-check and production build passed, Vitest reported
124/124 passing, OpenAPI coverage was 31/31 with seven known Redocly warnings,
and design validation covered 13 required documents, 100 routes, and 32 flows.
These counts are a dated baseline, not permanent targets.

## Default checks

Run from the repository root.

| Command                        | Scope                                                                             | Environment/effects                             | Expected / common failure                                        |
| ------------------------------ | --------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------- |
| `pnpm lint`                    | ESLint across workspaces                                                          | Read-only; no provider credentials              | Zero errors; warnings may remain / rule or config drift          |
| `pnpm type-check`              | TypeScript no-emit                                                                | Read-only; generated DB types matter            | Exit 0 / stale types, invalid import, component contract         |
| `pnpm test`                    | Vitest unit/integration, including actions/handlers/domain mocks                  | Test process; no production credentials         | At least baseline coverage where unchanged / behavior regression |
| `pnpm build`                   | Next.js production build using webpack                                            | Writes ignored `.next`; build env may be needed | Exit 0 / missing env, route, type, or bundling error             |
| `pnpm docs:generate`           | Deterministic OpenAPI JSON generation                                             | Rewrites `docs/api/openapi.json`                | No unreviewed diff / inventory drift                             |
| `pnpm docs:validate`           | OpenAPI coverage plus documentation links/tables                                  | Read-only after generation                      | 31/31 / contract or link drift                                   |
| `pnpm docs:semantic:validate`  | Redocly OpenAPI semantic lint, pinned through `pnpm dlx`                          | Downloads pinned CLI when uncached; read-only   | No errors; seven baseline warnings / semantic contract drift     |
| `pnpm docs:design:validate`    | Required design docs, route and flow inventory                                    | Read-only                                       | 13 docs, 100 routes, 32 flows at baseline                        |
| `pnpm docs:technical:validate` | Technical docs, links/tables/Mermaid, env, commands, runbooks, secret/path checks | Read-only                                       | 30 structured runbooks and no errors                             |
| `pnpm docs:all:validate`       | API + design + technical validators                                               | Read-only                                       | All validator suites pass                                        |

Formatting check for documentation changed in a branch:

```bash
pnpm exec prettier --check "README.md" "CONTRIBUTING.md" "SECURITY.md" "docs/**/*.md" "package.json"
```

## Specialized checks

Playwright tests live in `apps/web/e2e/` and cover role boundaries,
cross-tenant behavior, notifications, Storage, and automated accessibility
checks. They need installed browsers, a running app/database, and dedicated
`E2E_*` fixtures:

```bash
pnpm --filter @venora/web exec playwright test
```

Never target real users or production. Automated axe checks do not replace
keyboard, screen-reader, zoom, contrast, motion, or responsive testing.

Database/RLS tests should use a disposable project/local stack with at least two
tenants and positive/negative callers. Confirm functions, grants, policies,
booking races, payment reconciliation, notification helpers, analytics scope,
and Storage paths. The current default Vitest suite does not prove live deployed
RLS/grants.

Notification/provider commands exist but can query/write external test data or
send email:

```bash
pnpm run test:notifications:providers
pnpm run test:notifications:db
pnpm run test:notifications:pipeline
pnpm run test:notifications:e2e
```

Run only with dedicated non-production credentials. Payment tests primarily use
mocks; perform separately approved PayMongo test-mode checkout/webhook smoke
tests. Analytics export, authenticated role flows, Edge Functions, and provider
delivery remain runtime-verification areas.

Production smoke tests must be read-mostly and approved: confirm deployed
commit, health/marketing pages, authentication callback, authorized sample
queries, and provider dashboard delivery without creating real charges or using
customer accounts. Secret scans should inspect the changed/staged diff plus
tracked files; findings must be reviewed, not blindly allow-listed.
