# Workflow Security

## Controls implemented

- PR jobs use no provider/application secrets and never mutate hosted systems.
- Workflow and job permissions default to `contents: read`.
- Only CodeQL receives `security-events: write` in its own job.
- Every third-party action is pinned to a full commit SHA.
- Checkout disables persisted credentials.
- `pull_request_target`, secret inheritance, environment dumps, shell-piped
  downloads, silent gate failures, Vercel CLI deployment, and database resets
  are rejected by `pnpm ci:workflows:validate`.
- Superseded PR CI is cancelled; protected operations are never auto-cancelled.
- Artifacts have short retention and contain results, not credentials.
- Package-store and Playwright caches are lockfile-keyed and never contain
  environment files, generated types, or protected evidence.
- Manual workflows execute code from `main`; a supplied deployment SHA is data,
  never an arbitrary secret-bearing checkout target.

## Threat boundaries

Treat workflow YAML, scripts it invokes, composite actions, lockfiles, and
Dependabot changes as privileged code. Review changes to `.github/`, `scripts/`,
`package.json`, `pnpm-lock.yaml`, migrations, and deployment docs carefully.
Never run untrusted PR code in a job that can access protected secrets.

Gitleaks scans history; the changed-content scanner also rejects common tokens,
private keys, and local paths. Detection is not proof no secret exists. If a
secret is committed, revoke/rotate first, remove it from current content, assess
history exposure, and document the incident without reproducing the value.

## Dependency policy

Dependency Review blocks newly introduced moderate-or-higher vulnerable packages.
The production audit and CodeQL run on PR/main/schedule. Dependabot opens small
weekly package and action updates. Review immutable action SHA changes like code;
do not merge only because automation created the PR. npm production and
development minor/patch updates are grouped separately. Major updates remain
individual, security updates receive the same required gates, and no dependency
class is blindly auto-merged.

The pinned pnpm 9 package override and forward-compatible workspace override
both select PostCSS 8.5.16, replacing Next.js's vulnerable 8.4.31 transitive
version. Recheck and remove both after Next.js ships a patched requirement.

## Known Edge Function gate

Static security/configuration validation is active for all seven functions. A
full `deno fmt --check supabase/functions` currently reports 12 legacy files,
and full `deno check --no-config --node-modules-dir=none --frozen --lock=deno.lock`
reports 15
existing type/import errors. These are BLOCKED, not passing. Protected Edge
deployment performs strict Deno checks on the selected function and stops
before deployment on failure. Hosted JWT state is checked from CLI metadata
when available and otherwise recorded UNVERIFIED.
