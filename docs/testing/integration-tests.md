# Integration and Workflow Tests

## Automated boundaries

`pnpm test:integration` runs controlled action/use-case tests for booking
approval, calendar ownership and overlap, checkout creation, and webhook
settlement. Supabase/provider calls are mocked; no live charges occur.

## Booking lifecycle trace

| Step                         | Coverage | Evidence or gap                                                    |
| ---------------------------- | -------- | ------------------------------------------------------------------ |
| Inquiry and availability     | Partial  | Availability rules/RPC contract tested; browser submission blocked |
| Owner approval/rejection     | Partial  | Action tests enforce RPC, amounts, ownership errors                |
| Payment requirement/checkout | Partial  | Mocked start-checkout and PayMongo contract                        |
| Settlement/confirmation      | Partial  | Idempotent webhook use case and reconciliation migration static    |
| Invoice/receipt              | Partial  | SQL trigger/function static; hosted row effects blocked            |
| Supplier eligibility         | Partial  | Eligibility/snapshot pure/action tests                             |
| Completion/review            | Partial  | Migration logic present; full lifecycle blocked                    |
| Cancellation/refund          | Partial  | Cancellation scripts and payment tests; full E2E blocked           |

## Negative coverage

Past/overlapping dates, invalid amounts, unauthorized owner actions, duplicate
approval, missing payment references, already-settled payments, late events,
unknown events, and supplier eligibility are covered in focused suites. Guest
capacity, blackout, approval/cancellation races, duplicate review, full refund
effects, and atomic multi-record outcomes still need a disposable database.

## Notification integration

Notification browser tests now use condition polling rather than arbitrary
sleeps and clean their inserted notification. Provider/DB commands require
dedicated QA credentials; see [execution guide](execution-guide.md).
