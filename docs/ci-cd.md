# CI/CD

Venora uses secret-free pull-request gates, scheduled security analysis, manual
hosted verification, and protected Supabase operations. Vercel Git integration
remains the deployment authority; repository workflows verify deployments but
do not create a second Vercel deployment path.

## Automation inventory

The baseline had no `.github/workflows`, custom actions, Dependabot file, or PR
template. The following is the consolidated current inventory; no duplicate or
conflicting workflow was retained.

| File                          | Trigger                    | Purpose/jobs                                                        | Permissions                               | Secrets (names only)                                 | Environment            | Artifacts                           | Deployment/database behavior                      | Failure/duplication/security                        | Status/action                                 |
| ----------------------------- | -------------------------- | ------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------- | ---------------------- | ----------------------------------- | ------------------------------------------------- | --------------------------------------------------- | --------------------------------------------- |
| `ci.yml`                      | PR, `main`, manual         | Static contracts; deterministic tests; build                        | `contents: read`                          | None                                                 | None                   | Test and contract summaries, 7 days | No hosted mutation                                | Required failure stops job; no duplicate; fork-safe | CURRENT; require three jobs                   |
| `security.yml`                | PR, `main`, weekly, manual | Dependency review/audit; Gitleaks; CodeQL                           | Read; CodeQL has `security-events: write` | Default `GITHUB_TOKEN` only                          | None                   | Native security results             | No mutation                                       | Findings fail; features may depend on GitHub plan   | CURRENT BUT INCOMPLETE until first run        |
| `hosted-verification.yml`     | Manual                     | Binding; migration/policy assertion; E2E/accessibility; Storage RLS | `contents: read`                          | Staging fixtures, Supabase, Vercel                   | `staging`              | Hosted evidence/traces, 7 days      | Namespaced staging test objects; cleanup required | Fails closed; serialized; trusted `main` only       | CURRENT BUT INCOMPLETE pending staging setup  |
| `deployment-verification.yml` | `main`, manual             | Vercel binding, public E2E/a11y, smoke routes                       | `contents: read`                          | `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | Production/selected    | Deployment/browser report, 7 days   | Read-only Vercel API                              | Exact SHA/project/URL mismatch fails; serialized    | CURRENT BUT INCOMPLETE pending environments   |
| `protected-operations.yml`    | Manual                     | Migration plan/apply or one Edge deploy                             | `contents: read`                          | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`      | `staging`/`production` | Migration or Edge evidence, 7 days  | Approved linked DB push or single function        | Exact confirmation; protected/serialized; never PR  | CURRENT BUT INCOMPLETE pending approval rules |

Supporting automation is CURRENT: Dependabot, the PR template, migration
allowlist, package scripts, validators, focused secret/local-path scanner,
hosted/deployment guards, and release reports. There are no custom actions,
issue templates, CODEOWNERS, committed Vercel project metadata, or automated
release records; those are NOT APPLICABLE or MISSING and are not fabricated.

## Pull-request gates

Required status checks should use the exact job names documented in
[branch protection](branch-protection.md). PR workflows receive no provider,
database, application, or user credentials. Hosted suites are reported
`BLOCKED`, not passed, until the protected staging workflow executes.

`pnpm format:check` checks changed non-generated source/documentation files;
legacy repository-wide formatting debt is not silently rewritten. `pnpm test:ci`
executes the non-overlapping unit/component/integration suites,
then domain-specific booking, payment, analytics, security, and AI gates. It
requires at least 124 canonical Vitest tests and writes machine-readable and
Markdown summaries to `artifacts/ci/`.

Four supplier files that arrived unformatted in upstream commit `323d823` are
exactly listed in `.github/ci/format-allowlist.json`. The formatter verifies each
was already unformatted at the comparison base and emits visible warnings; new
files or newly formatted baselines cannot use the exception. Remove entries in
a dedicated style-only change rather than mixing broad formatting into fixes.

`pnpm edge:validate` inventories every Edge Function and checks entrypoints,
environment access, CORS/preflight, error handling, authentication assumptions,
service-role use, and obvious secret literals. Full Deno formatting/type/import
validation remains visibly blocked by legacy debt (12 formatting failures and
15 type errors). Protected Edge deployment runs strict Deno checks for the
selected function and refuses deployment on failure.

The pnpm store is lockfile-keyed by `setup-node`; protected hosted browser runs
also cache Chromium by OS and lockfile. No generated database types, secrets,
environment dumps, build outputs, or PR-produced executables are cached.

Changed-file handling is deliberately conservative. Base-SHA diff detection
scopes formatting and focused secret/local-path scanning, but never skips lint,
types, deterministic tests, migration/type contracts, documentation, security
regressions, or build. Hosted browser/stateful suites remain a separate visible
protected stage rather than a path-filtered green result.

Provider-safe notification, PayMongo, Resend, Web Push, and AI hosted checks
remain explicitly BLOCKED because no authorized staging provider credentials or
fixtures are available to repository CI. Deterministic mocked/contract security
tests still run; they are not represented as hosted proof.

## Deployment model

1. PR gates pass and review is approved.
2. Merge to `main`; repeat CI and security jobs run.
3. Vercel Git integration creates preview/production deployments according to
   dashboard settings. Protected production verification polls up to ten
   minutes for the exact pushed SHA; an older deployment `200` never passes.
4. For preview/staging, run `Deployment verification` manually with the exact
   URL and full commit SHA.
5. Run protected staging verification before production approval when the
   change touches authenticated flows, RLS, Storage, integrations, or UI.
6. Perform approved Supabase operations through the protected workflow.
7. Verify production and preserve the release manifest.

GitHub environment settings, branch rules, secrets, Vercel Git integration,
hosted migration history, and the deployed production commit are external
state. Configure and verify them using the linked runbooks; repository files do
not prove dashboard state.

## Local commands

```bash
pnpm install --frozen-lockfile
pnpm validate:ci
pnpm security:audit
```

Hosted commands intentionally fail without protected non-production
configuration. See [CI secrets](ci-secrets.md),
[hosted verification](hosted-database-verification.md), and
[troubleshooting](ci-troubleshooting.md).
