# Contributing to Venora

## Workflow

1. Pull `main` before starting and confirm the working tree is understood.
2. Use a short-lived focused branch unless the repository owner explicitly
   authorizes direct work on `main`.
3. Keep commits focused and use Conventional Commit subjects such as
   `fix:`, `feat:`, `docs:`, `test:`, or `chore:`.
4. Do not mix broad formatting or unrelated refactors into a change.
5. Open a pull request describing scope, risk, validation, migrations, and
   follow-up work. Resolve review findings before merge.

Never commit credentials, `.env.local`, personal test accounts, production data,
database dumps, or provider dashboards/screenshots containing secrets. Use the
placeholders in `.env.example`.

## Change rules

- Put feature code under the closest `apps/web/src/features/<feature>/` module;
  keep server-only logic out of Client Components.
- Enforce authorization on the server and through RLS. Hidden navigation is not
  an authorization boundary.
- Add new SQL as a new ordered migration. Never edit an already-applied
  migration without an approved repair plan. Review destructive SQL manually.
- Regenerate `packages/database/types/generated.ts` only from a migration-complete
  local database; do not hand-edit it.
- Update `docs/api/` and regenerate OpenAPI when HTTP, Server Action, RPC,
  Storage, or webhook contracts change.
- Update `docs/design/` when routes, screens, flows, responsive behavior, or
  accessibility contracts change.
- Preserve keyboard access, names, focus behavior, landmarks, contrast, and
  responsive behavior. Record manual checks when automation is insufficient.

## Definition of done

Run from the repository root:

```bash
pnpm lint
pnpm type-check
pnpm test
pnpm build
pnpm docs:all:validate
```

Run relevant Playwright, database, integration, or provider checks when the
change touches those surfaces. External-service checks require dedicated test
credentials and must not use production customer data. A change is complete
when behavior, tests, documentation, security impact, deployment impact, and
rollback/recovery are reviewed.

Production migrations, deployments, secret rotation, and emergency access need
explicit approval. See [deployment](docs/deployment.md),
[migrations](docs/migrations.md), and [security](SECURITY.md).
