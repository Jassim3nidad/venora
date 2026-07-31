# Structured Venue Foundation Verification

Date: 2026-07-31
Branch: `feature/structured-venue-foundation`
Classification: implemented but live RLS verification incomplete.

## Safe Target Check

Attempted local-only commands:

- `supabase status`
- `docker ps --format "table {{.Names}}\t{{.Status}}"`
- `supabase start`

Result:

- Supabase CLI attempted the local project and local Docker engine.
- Docker Desktop Linux engine pipe was unavailable.
- No remote Supabase project was contacted.
- No production database was used.
- No secrets were printed in this report.

## Standard Migration Workflow

Command:

- `supabase start`

Result:

- Failed before migration execution because Docker Desktop was unavailable.

Impact:

- Standard local migration-chain validation is not complete.
- Live RLS behavior cannot be claimed as verified.

## Historical Drift

Earlier local checks showed historical schema drift where the existing local database lacked required coordinator and structured dependencies. This Batch E did not repair old migrations, rewrite committed migrations, or alter production state.

## Structured Tests

Fresh focused results during Batch E:

- `pnpm db:types:validate`: passed.
- `pnpm --filter @venora/web test -- structured-venue-database-types structured-profile-compatibility`: passed, 10/10.
- `pnpm --filter @venora/web test -- structured-venue structured-profile`: passed, 61/61.
- `pnpm --filter @venora/web test -- venues`: passed, 84/84.
- `pnpm --filter @venora/web test -- rbac permissions roles coordinator-permissions`: passed, 15/15.
- `pnpm test:database`: passed with allowlisted historical migration warnings.
- `pnpm --filter @venora/web type-check`: passed when rerun outside the sandbox.
- `pnpm --filter @venora/web build`: passed when rerun outside the sandbox.

The Vitest command required escalation because the sandbox could not open the installed Vitest module under `node_modules`.

The first sandboxed type-check attempt produced missing-module errors for installed dev dependencies. The same command passed outside the sandbox. The first sandboxed build attempt failed with EPERM opening the installed Next binary; the same command passed outside the sandbox.

## Database-Type Coverage

Covered structured tables:

- `venue_profile_revisions`
- `venue_spaces`
- `venue_space_capacity_layouts`
- `venue_space_amenities`
- `venue_space_event_types`
- `venue_media_collections`
- `venue_media_items`
- `venue_logistics`
- `venue_faqs`
- `package_venue_spaces`

Contract checks cover Row, Insert, Update, required insert fields, optional DB-default fields, controlled values, and partial updates.

## Backward-Compatibility Coverage

Focused tests cover:

- Existing venue with no structured revision returns `null`.
- Draft-only content is not returned through the published aggregate.
- Published structured content loads as an optional aggregate.
- Archived content is not treated as current public aggregate.
- Package-space relationships are optional.
- Structured media collections are optional.
- Public reads do not create drafts.
- Repository errors are sanitized.

## Live RLS Matrix

Not executed because Docker was unavailable.

Required before final live verification:

- Owner A and Owner B cross-owner matrix.
- Assigned coordinator with permission.
- Assigned coordinator without permission.
- Wrong-venue coordinator.
- Unassigned coordinator.
- Customer.
- Supplier.
- Anonymous.
- Existing admin convention.
- Publication matrix.
- Media path matrix.
- Repository live operations.
- Server-action authorization.

## Cleanup

No disposable local records were created because Docker/local Supabase did not start.

## Release Impact

Batch E source/type/test work is complete through static and unit contracts. Phase 2.2 must remain classified as `Implemented but live RLS verification incomplete` until a local Docker-backed Supabase database can run the required live RLS matrix.
