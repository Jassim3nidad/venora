# Late or Out-of-Order PayMongo Webhook

## Purpose

Reconcile delayed provider events against current state without regression.

## Symptoms

Paid event arrives after failure/cancel/expiry or events arrive in unexpected order.

## Impact

Customer paid while booking state/documents disagree; unsafe replay may regress state.

## Preconditions

Full provider event timeline, payment attempts, booking history, and expected amounts.

## Safety warnings

Do not order by receipt time alone, overwrite terminal status, or refund/recharge blindly.

## Investigation steps

1. Sort provider-created and received timestamps plus internal audit history.
2. Verify signature, event claim, booking/reference/amount/currency, and current status.
3. Determine whether current state is already settled, recoverable, cancelled, or expired.

## Diagnostic commands

```bash
rg -n "confirmed|completed|reviewed|approved|payment_pending" supabase/migrations/046_payment_confirmation_reconciliation.sql
pnpm --filter @venora/web test -- paymongo
```

## Expected evidence

Authoritative chronology and a reconciliation decision tied to exact identifiers.

## Resolution steps

Let normal idempotent reconciliation process valid recoverable events. For cancelled/
expired conflicts, pause automated action and obtain finance/booking-owner decision.

## Validation

Final booking/payment/refund/documents/commission/audit agree with provider evidence.

## Rollback or recovery

Use approved refund or forward state repair; never erase the late event.

## Escalation criteria

Paid cancelled event, amount/currency mismatch, customer impact, or ambiguous chronology.

## Required secrets or permissions

Provider delivery read, financial/booking audit read, finance approval for correction.

## Related documentation

[Payments](../payments.md), [paid pending](13-paid-booking-pending.md), and
[refund mismatch](15-refund-mismatch.md).
