# Duplicate PayMongo Webhook

## Purpose

Confirm duplicate delivery is idempotent and prevent duplicate settlement effects.

## Symptoms

Same event ID arrives repeatedly; duplicate logs, notifications, or documents appear.

## Impact

Potential duplicate confirmation, receipt, commission, or notification.

## Preconditions

Provider event ID, all delivery times, booking/payment IDs, and current records.

## Safety warnings

Do not delete webhook evidence or mark rows manually to silence retries.

## Investigation steps

1. Compare provider event IDs/payload hashes and webhook event claim records.
2. Inspect payment, booking, receipt, invoice, commission, notification, and audit counts.
3. Determine whether response timeouts caused provider retry or claim is non-atomic.

## Diagnostic commands

```bash
rg -n "idempot|claim|event_id|already" apps/web/src/features/payments supabase/migrations
pnpm --filter @venora/web test -- paymongo
```

## Expected evidence

One canonical claimed event and one settlement side-effect set, or exact duplicates.

## Resolution steps

If idempotent, acknowledge and monitor. Otherwise contain webhook processing,
fix unique/transactional claim and side-effect idempotency, then reconcile records.

## Validation

Replay the same test event multiple times; exactly one settlement/document set remains.

## Rollback or recovery

Do not delete financial records; correct through audited reversal/forward repair.

## Escalation criteria

Duplicate charge/refund/document/commission or customer-facing financial discrepancy.

## Required secrets or permissions

PayMongo delivery read, payment database read, approved finance correction rights.

## Related documentation

[Payments](../payments.md), [late webhook](12-late-paymongo-webhook.md), and
[refund mismatch](15-refund-mismatch.md).
