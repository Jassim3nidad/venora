# Structured Venue Foundation Verification

Date: 2026-07-31
Branch: `feature/structured-venue-foundation`
Classification: complete with standard migration-chain limitation.

## Safe Target Check

Local-only preflight passed:

- `git status --short`: clean before verification.
- `git branch --show-current`: `feature/structured-venue-foundation`.
- Required structured commits were present in `git log --oneline -10`.
- Docker context: `desktop-linux`.
- Docker server: Docker Desktop Linux engine reachable.
- Supabase local project: running on localhost Docker services.
- Local PostgreSQL container: `supabase_db_venora`, healthy on localhost.

No remote Supabase project or production database was contacted.

## Standard Migration Workflow

The standard local database was reachable, but it still has historical migration drift:

- The local migration history table reported many migrations as applied.
- The actual local schema did not contain all structured tables and dependencies.
- The normal `supabase start`/standard chain was therefore not used as proof for this Task 14 closure.

Impact:

- Complete historical-chain replay is still a known local-environment limitation.
- Structured venue RLS was verified through an isolated disposable database using the exact dependency closure below.

## Disposable Verification Strategy

Created and later dropped:

- Database: `structured_venue_rls_verify`

Bootstrap added only to the disposable database:

- `auth.users`
- `auth.uid()`
- local `auth.uid()` grants for `anon` and `authenticated`
- local base grants needed for server-action role/venue lookups

Applied dependency migrations:

- `002_enums.sql`
- `003_auth_profiles.sql`
- `0040_venues.sql`
- `0045_venues_core.sql`
- `20260716073258_coordinator_staff_invitations.sql`
- `20260722060514_venue_coordinator_assignments.sql`
- `20260723125523_coordinator_permissions.sql`

Applied structured migrations:

- `20260731090000_structured_venue_foundation_core.sql`
- `20260731091000_structured_venue_space_relationships.sql`
- `20260731092000_structured_venue_media.sql`
- `20260731093000_structured_venue_logistics_faqs.sql`
- `20260731094000_structured_venue_publication_access.sql`
- `20260731095000_package_venue_spaces.sql`
- `20260731100000_structured_venue_write_access.sql`

All listed migrations applied successfully to the disposable database.

## Live Schema Verification

Verified live database state for:

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

Results:

- RLS enabled on all ten structured tables.
- Each structured table had five policies in the disposable schema.
- Primary keys, foreign keys, unique constraints, check constraints, indexes, and update triggers were present.
- Helper functions were `SECURITY DEFINER`.
- Helper functions used fixed `search_path = public, pg_catalog`.
- `anon` had `SELECT` only.
- `authenticated` had table write grants, with writes constrained by RLS.

Verified schema invariants:

- One active draft per venue.
- One current published revision per venue.
- Venue-scoped space slug uniqueness.
- Capacity constraints.
- Same-space taxonomy relationship integrity.
- Media parent integrity.
- One logistics row per approved parent revision.
- FAQ ordering/publication constraints.
- Same-venue package-space relationships.
- Publication-state constraints.

## Disposable Role Fixtures

Created disposable local identities only in the disposable database:

- Owner A
- Owner B
- Coordinator assigned to Venue A with `manage_assigned_venue_listings`
- Coordinator assigned to Venue A with `view_assigned_venues` only
- Coordinator assigned to Venue B
- Unassigned coordinator
- Customer
- Supplier
- Admin
- Anonymous session via `anon` role

Created disposable orgs, venues, venue packages, coordinator assignments, amenities, event types, draft revisions, published revisions, spaces, capacity layouts, media collections/items, logistics, FAQs, and package-space rows.

## Live RLS Matrix

Owner A and Owner B:

- Owners created and read their own draft revisions.
- Owners managed own spaces, ordering, capacity layouts, amenities, event types, media metadata, logistics, FAQs, and package-space links.
- Owners published their own structured revision.
- Owner A could not read Owner B draft content.
- Owner A could not update or publish Owner B content.
- Owner A could not reparent Venue A content to Venue B.
- Owner A could not attach Venue B or Organization B media paths.
- Owner A could not create cross-venue package-space relationships.

Coordinator with permission:

- Assigned coordinator with `manage_assigned_venue_listings` created a draft and draft space for the assigned venue.
- Assigned coordinator could preview permitted draft content.
- Assigned coordinator could not publish.
- Assigned coordinator could not manage another venue.

Coordinator without permission:

- Assigned coordinator with view-only permission could preview draft content.
- View-only coordinator could not edit.

Wrong-venue and unassigned coordinators:

- Coordinator assigned to Venue B could not manage Venue A.
- Unassigned coordinator could not manage Venue A.
- Role alone did not grant structured venue access.

Customer, supplier, anonymous:

- Customer, supplier, and anonymous users could read published structured content.
- Customer, supplier, and anonymous users could not read draft content.
- Customer, supplier, and anonymous users could not write.

Admin:

- Existing `is_admin()` helper path allowed admin update of structured draft content.
- No client-side or browser-side admin bypass was added.

Publication:

- Draft content was hidden publicly before publish.
- Published spaces/media/logistics/FAQs were public-readable after publish.
- Repeated publication was safe.
- Coordinator publish was denied.
- Customer, supplier, and anonymous publish/write paths were denied.
- Invalid publication state was rejected.

Package/media:

- Same-venue package-space link was accepted.
- Cross-venue package-space link was rejected.
- Correct `{organization_id}/{venue_id}/...` media path was accepted.
- Wrong organization, wrong venue, and malformed media paths were rejected.
- Public reads exposed only published media metadata.

RLS matrix result:

- Main matrix: 38/38 valid assertions passed after correcting update-denial checks to row-count assertions.
- Hidden-update row-count matrix: 5/5 passed.
- Invariant/admin matrix: 5/5 passed.

## Repository and Server-Action Live Verification

Temporary local tests were added, run, and removed before documentation commit.

Live repository verification:

- Command: `pnpm --filter @venora/web exec vitest run src/features/venues/application/structured-profile-live.local.test.ts`
- Result: passed, 1/1.
- Covered draft creation, duplicate draft reuse, draft lookup, space CRUD, space ordering, capacity layouts, taxonomy links, media collection/item metadata, logistics upsert, FAQ create, package-space replace, draft aggregate, wrong-owner denial, publish, published aggregate, and safe no-revision result.

Live server-action verification:

- Command: `pnpm --filter @venora/web exec vitest run src/features/venues/application/structured-profile-actions-live.local.test.ts`
- Result: passed, 2/2.
- Covered anonymous denial, owner success, wrong-owner denial, coordinator edit behavior, coordinator publish denial, customer denial, supplier denial, strict Zod validation, server-derived current user, live repository/RLS calls, safe errors, and route revalidation through the mocked Next revalidation boundary.

Temporary verification files were removed after passing.

## Focused Regression Tests

Fresh final verification should include:

- `pnpm --filter @venora/web test -- structured-venue structured-profile`
- `pnpm --filter @venora/web test -- venues`
- `pnpm --filter @venora/web test -- rbac permissions roles coordinator-permissions`
- `pnpm test:database`
- `pnpm --filter @venora/web type-check`
- `pnpm --filter @venora/web build`
- `git grep -n -E "^(<<<<<<<|=======|>>>>>>>)"`
- `git diff --check`

## Cleanup

The disposable database `structured_venue_rls_verify` was dropped after verification.

Cleanup result:

- Disposable users, organizations, assignments, venues, structured rows, and permission fixtures removed with the disposable database.
- No source migrations were rewritten.
- No RLS policies were disabled.
- No debug policies were added.
- No service-role UI code was added.
- Public UI unchanged.
- Venue-owner UI unchanged.
- Customer Event Planning unchanged.

## Release Impact

Structured venue foundation RLS is live verified locally through an isolated disposable database.

Remaining limitation:

- The full historical local migration chain still has unrelated drift in the existing local development database. This Task 14 did not repair historical drift and does not claim full historical-chain replay.

Phase 2.2 can proceed to Phase 2.3 with this standard migration-chain limitation documented.
