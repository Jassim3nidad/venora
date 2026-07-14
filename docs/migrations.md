# Database Migrations

SQL migration files under `supabase/migrations/` are ordered, reviewable schema
history. There are 73 files at the current baseline. Names mostly follow
`NNN_description.sql`, but legacy `0040`/`0045`, missing `030`, the upstream
`068`-to-`0680` rename, and duplicate `071` make numbering non-contiguous.

## Known history conflicts

Upstream commit `323d823` renamed
`068_enforce_booking_availability_integrity.sql` to
`0680_enforce_booking_availability_integrity.sql` without hosted history
evidence available to this task. It also added
`071_supplier_location_coverage.sql`, duplicating existing
`071_tighten_venue_media_storage_ownership.sql`. Supabase migration history is
version-based, so either change can make local/linked ordering or application
ambiguous. Do not rename, delete, repair, or mark these applied without checking
the actual hosted migration table/schema and approving a forward-only plan.

## Create and review

1. Pull current `main` and inspect all existing versions.
2. Choose a unique increasing timestamp/version according to the approved team
   convention; do not reuse a number.
3. Add a new file—never rewrite SQL already applied to a shared environment.
4. Review locks, table rewrites, deletes, defaults, enum changes, function
   privileges, RLS/policies, Storage policies, and rollback/recovery.
5. Rehearse on a disposable/local schema, then validate functions, policies,
   grants, generated types, app tests, and build.

```bash
supabase start
supabase db reset --local
supabase migration list --linked
supabase db push --dry-run --linked
```

Run from the repository root. The first two target local Docker; reset is
**destructive to local data**. The linked commands require project access and a
verified link; dry-run previews SQL. Never run an actual linked push merely to
test documentation.

## Hosted application

Applying hosted migrations is privileged. Confirm the project identifier,
backups/recovery plan, maintenance impact, approved change ticket, exact pending
list, and operator permissions. Preview first, then apply only through the
approved Supabase Dashboard/CLI workflow. Record start/end time, migration
versions, output, schema verification, app smoke tests, and operator.

The repository has no verified automatic migration workflow and PostgreSQL/Supabase
does not provide a universal automatic down migration. Prefer a new corrective
forward migration. A transaction can roll back only operations that remain in
that transaction and support transactional rollback.

## Failure and repair

Stop on the first failure. Preserve CLI/SQL error, current migration table, and
schema evidence. Determine whether the failed statement committed and whether
later SQL ran. Fix/rehearse in an isolated copy. `supabase migration repair` or
manual history edits can falsify state and therefore require database-owner
approval and exact evidence; do not use them as routine recovery.

After any migration:

```bash
pnpm db:types
pnpm type-check
pnpm test
pnpm build
```

Generate types only from a local database that successfully contains the full
approved history. Review the generated diff; never edit it manually. Verify new
tables, indexes, triggers, functions, execute grants, RLS enablement/policies,
and representative positive/negative queries. See the
[migration failure runbook](runbooks/03-supabase-migration-failure.md).
