# Database, Migration, and RLS Verification

## Static result

```bash
pnpm test:database
```

`scripts/validate-database-contracts.mjs` verifies required migrations,
out-of-order names, duplicate versions, migration 070 type fields, critical
functions/triggers/policies, venue-media path ownership, and active unsafe
PUBLIC grants.

## Findings

- Upstream renamed `068_enforce_booking_availability_integrity.sql` to `0680_...`
  without hosted proof, so reapplication/history risk remains tracked.
- `071_supplier_location_coverage.sql` duplicates
  `071_tighten_venue_media_storage_ownership.sql`; both exact files are
  allowlisted pending hosted history/schema reconciliation.
- Legacy padded `0040`/`0045` ordering is detected and warned. Renaming also
  needs hosted-history proof.
- Migration 070 fields `image_urls`, `status`, `service_id`, and `venue_name`
  exist in `packages/database/types/generated.ts`; `title` and `image_url` are
  nullable. Static type consistency passes.
- Supplier-location fields from the second migration 071 are present in the
  generated `supplier_profiles` contract.
- Migration `071_tighten_venue_media_storage_ownership.sql` binds Storage
  insert/update/delete to `{organization_id}/{venue_id}` and membership, with
  admin override.

## Runtime matrix

| Actor           | Required negative proof                             | State                                      |
| --------------- | --------------------------------------------------- | ------------------------------------------ |
| Unauthenticated | No profiles/bookings/payments/admin/private Storage | BLOCKED                                    |
| Customer A/B    | Own-only booking, receipts, reviews                 | Partial Playwright; hosted fixture blocked |
| Venue A/B       | Own venue/media/analytics/approval only             | BLOCKED: second tenant unavailable         |
| Supplier A/B    | Own records; eligible snapshots only                | BLOCKED: second supplier unavailable       |
| Coordinator     | Exact partial scope; no unrelated records           | IMPLEMENTED BUT UNTESTED                   |
| Admin tier      | Module permission denial and audit access           | Playwright listed; runtime blocked         |

`supabase migration list` is blocked without `SUPABASE_ACCESS_TOKEN`. Local SQL,
RLS, triggers, grants, and migration application are blocked because Docker is
not installed. Static success does not prove hosted policy state. Apply and
verify migration 071 in disposable/hosted QA before production rollout.
