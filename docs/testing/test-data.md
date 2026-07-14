# Test Data, Factories, and Cleanup

## Rules

- Synthetic names/emails only; never copy production rows.
- Stable UUID namespace and case prefix per suite/worker.
- Explicit owner IDs for customer, venue organization, supplier, coordinator,
  and administrator fixtures.
- Logical dates relative to a controlled clock; no implicit current-date races.
- Cleanup in `finally`/fixture teardown; never broad table deletes.
- Service role only in test orchestration, never browser code or logs.
- Refuse production URLs/projects before seed or cleanup.

## Required factory set

| Factory                  | Minimum fields/relationships                     | State                     |
| ------------------------ | ------------------------------------------------ | ------------------------- |
| Users/roles/admin tiers  | Profile, role, tier, permissions                 | Environment fixtures only |
| Venues/packages/calendar | Org owner/member, capacity, package, dates       | MISSING reusable factory  |
| Booking/snapshots        | Customer, venue, status, amounts, event snapshot | MISSING reusable factory  |
| Payment/refund/documents | Provider refs, idempotency IDs, invoice/receipt  | Mock builders only        |
| Supplier/inquiry/quote   | Supplier owner, eligibility, snapshots           | Mock builders only        |
| Reviews/notifications    | Eligible booking, recipient, channel             | Partial ad hoc fixture    |
| Analytics/storage        | Tenant-scoped rows/object paths                  | MISSING reusable factory  |

Existing Vitest tests use deterministic inline builders and mocks. Playwright
uses environment-provided QA accounts. A disposable DB seed/rollback harness is
still required for parallel RLS and lifecycle tests.
