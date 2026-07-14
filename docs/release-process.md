# Release Process

## Roles

| Role             | Responsibility                                        |
| ---------------- | ----------------------------------------------------- |
| Author           | Scope, tests, migration compatibility, rollback notes |
| Reviewer         | Code/security/data review; confirms evidence          |
| Release approver | Approves protected production environment             |
| Operator         | Runs the approved workflow and records evidence       |

The author and production approver should be different people where staffing
allows. Never approve a run whose commit, target, or change reference differs
from the reviewed release.

## Process

1. Pull current `main`; record the starting commit and clean tree.
2. Make focused changes. Add forward-only migrations; do not edit applied SQL.
3. Run `pnpm validate:ci` and production dependency audit.
4. Open a PR. Resolve all required checks and review comments.
5. Confirm preview URL is bound to the PR commit using `Deployment verification`.
6. Run protected staging verification for release-relevant hosted behavior.
7. Merge. Confirm local `main`, `origin/main`, and the approved SHA match.
8. Run `database-plan` in the protected target environment. Review pending
   migrations, the upstream `068`-to-`0680` rename, and duplicate `071` before
   any apply.
9. Apply migrations only with exact `APPLY production` confirmation and required
   reviewer approval. Deploy Edge Functions individually with an explicit,
   verified JWT mode.
10. Let Vercel Git integration deploy. Do not run a parallel Vercel CLI deploy.
11. Approve and inspect automatic protected production verification for Vercel
    state, exact source SHA, public routes, accessibility smoke, and protected
    redirects; then verify release-specific authenticated flows.
12. Generate and retain the [release manifest](release-manifest.md).

If any required hosted evidence cannot run, status is partial or blocked. A
green repository CI run is not proof that staging or production works.

## Version and release notes

Use the merged commit SHA as the immutable release identity. If tags/releases
are adopted, create them only after production verification and point them to
that SHA. Record migrations, Edge Functions, environment-variable changes,
known warnings, and rollback owner in release notes.
