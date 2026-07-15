# Hosted Database Verification

Hosted verification runs only in the protected `staging` environment. It fails
closed if the application host or Supabase project matches production, if HTTPS
or allowlisting is missing, or if dedicated fixture credentials are absent.

## Fixture contract

Provide disposable accounts for all Playwright roles plus three Storage RLS
identities:

- tenant A member with a venue in organization A;
- tenant B member with a venue in different organization B;
- authenticated non-member customer.

Do not reuse staff, customer, demo, or production accounts. Fixture records must
contain no personal information and may be reset by the staging owner.

## Venue-media assertions

Before behavioral tests, the hosted workflow uses the staging database URL to
require migration 071 in Supabase migration history and inspect the three final
Storage policies for organization, venue-path, and membership predicates. The
query is assertion-only and writes a redacted PASS marker artifact.

`pnpm hosted:rls` authenticates with the public key and verifies:

- tenant member upload/update/delete succeeds only for its encoded
  `{organization_id}/{venue_id}` path;
- cross-tenant update/delete cannot change tenant B's object;
- a non-member cannot upload to a venue path;
- public reads still work for the public `venue-images` bucket;
- service-role bypass is tested and reported separately;
- all namespaced test objects are removed in cleanup.

The check validates behavior, not only SQL text. Migration
`0711_tighten_venue_media_storage_ownership.sql` must be applied to staging.

## Migration history

Before any production apply, compare `supabase migration list --linked` against
the repository. While this CI/CD work was being rebased, upstream commit
`323d823` renamed `068_enforce_booking_availability_integrity.sql` (originally
added at `b88fbd5d556dcc213bbdcd3f9d5051afd639cd9b`) to
`0680_enforce_booking_availability_integrity.sql`. The local duplicate `068` is
gone, but hosted history was not available to prove that renaming was safe or
that the SQL will not be treated as a new `0680` migration. CI tracks the exact
rename and ordering exception; it does not declare reconciliation complete.

The same upstream change introduced `071_supplier_location_coverage.sql`, which
now duplicates `0711_tighten_venue_media_storage_ownership.sql`. Both exact files
are allowlisted only to preserve current `main`; any third duplicate fails. The
hosted workflow requires both the supplier-location columns and venue-media
policy definitions, because a `071` history row alone cannot prove which SQL
contract ran.

Do not rename, delete, repair, or mark these entries applied without authorized
staging/production history and schema evidence. Prefer an approved forward
reconciliation migration if either contract is missing.

## Commands

```bash
pnpm hosted:guard
pnpm hosted:rls
pnpm test:e2e
```

These commands intentionally report `BLOCKED` outside protected staging.
