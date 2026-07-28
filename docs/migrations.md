# Database Migrations

SQL migration files under `supabase/migrations/` are ordered, reviewable schema
history. There are 113 files at the current baseline. Names mostly follow
`NNN_description.sql`, but legacy `0040`/`0045`, missing `030`, the upstream
`068`-to-`0680` rename, duplicate `071`, duplicate timestamp
`20260724000000`, and the legacy `0795`/`080` ordering make numbering
non-contiguous.

## Known history conflicts

Upstream commit `323d823` renamed
`068_enforce_booking_availability_integrity.sql` to
`0680_enforce_booking_availability_integrity.sql` without hosted history
evidence available to this task. It also added
`071_supplier_location_coverage.sql`, duplicating existing
`0711_tighten_venue_media_storage_ownership.sql`. Supabase migration history is
version-based, so either change can make local/linked ordering or application
ambiguous. Do not rename, delete, repair, or mark these applied without checking
the actual hosted migration table/schema and approving a forward-only plan.

Upstream commit `65d6f35d5a438e237194af0df2dd5361da94600d` introduced both
`20260724000000_fix_partner_application_notifications.sql` and
`20260724000000_fix_venue_grants.sql` with the same timestamp. The validator
tracks that exact pair while hosted history remains unavailable. It also tracks
`0795_business_profiles.sql` before `080_booking_supplier_coordinations.sql`;
their numeric prefixes sort differently from their repository chronology.
These exact exceptions preserve immutable history—they do not prove either
migration was applied. Remove an exception only after protected linked-history
and schema verification supports an approved forward reconciliation.

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
