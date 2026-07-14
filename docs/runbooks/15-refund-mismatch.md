# Refund Mismatch

## Purpose

Reconcile differences between PayMongo, refund records, booking status, and commission.

## Symptoms

Provider and Venora disagree on refund amount/status, or customer/finance records conflict.

## Impact

Financial loss, customer harm, incorrect commission, and audit/compliance risk.

## Preconditions

Payment/refund/provider IDs, original and requested amounts/currency, policy, full timeline.

## Safety warnings

Do not issue a second refund, edit provider IDs/amounts, or delete financial/audit records.

## Investigation steps

1. Confirm provider status from authoritative dashboard/API and internal refund attempts.
2. Reconcile amount/currency, partial/full status, timestamps, booking cancellation, commission.
3. Identify timeout, duplicate request, webhook delay, or manual provider action.

## Diagnostic commands

```bash
rg -n "refund|commission" apps/web/src/features/payments supabase/migrations
pnpm --filter @venora/web test -- refund
```

## Expected evidence

One financial timeline with authoritative provider outcome and internal discrepancy.

## Resolution steps

Pause retries, obtain finance approval, then use idempotent provider reconciliation or an
audited forward correction. Notify affected customer through approved support channel.

## Validation

Provider/internal refund amount/status, booking, receipt/invoice, commission, and audit agree.

## Rollback or recovery

Provider refunds may be irreversible; recover through accounting adjustment, not data erasure.

## Escalation criteria

Duplicate/over-refund, wrong currency/customer, production pattern, or disputed payment.

## Required secrets or permissions

PayMongo refund read/write as approved, finance owner, database audit read.

## Related documentation

[Payments](../payments.md), [late webhook](12-late-paymongo-webhook.md), and
[incident triage](28-production-incident-triage.md).
