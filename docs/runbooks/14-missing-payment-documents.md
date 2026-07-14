# Receipt or Invoice Not Created

## Purpose

Restore expected payment documents without duplicating or fabricating financial records.

## Symptoms

Approved booking lacks invoice, or confirmed payment lacks receipt.

## Impact

Customer/finance records are incomplete; compliance and reconciliation suffer.

## Preconditions

Booking/payment IDs, state history, expected amount/currency, and existing document rows.

## Safety warnings

Do not create arbitrary rows, reuse document numbers, or alter settled amounts.

## Investigation steps

1. Confirm approval/settlement occurred through canonical RPC and required amounts exist.
2. Inspect invoice/receipt uniqueness, trigger/RPC error, transaction rollback, and audit.
3. Check whether document exists but access/render/delivery failed.

## Diagnostic commands

```bash
rg -n "invoice|receipt" supabase/migrations/043_payments_platform.sql supabase/migrations/046_payment_confirmation_reconciliation.sql apps/web/src
pnpm --filter @venora/web test -- payment
```

## Expected evidence

Canonical transaction state, expected document type, and failed creation/access stage.

## Resolution steps

Fix the idempotent database/document path and run an approved backfill/reconciliation
for the exact booking; preserve identifiers and audit actor/reason.

## Validation

One correct invoice/receipt exists, is authorized/readable, matches settlement, and audits.

## Rollback or recovery

Void/correct through an approved financial record process; never hard-delete issued evidence.

## Escalation criteria

Number collision, amount mismatch, multiple affected settlements, or regulatory concern.

## Required secrets or permissions

Payment/document read; approved finance/database correction permission.

## Related documentation

[Payments](../payments.md), [paid pending](13-paid-booking-pending.md), and
[notifications](../notifications.md).
