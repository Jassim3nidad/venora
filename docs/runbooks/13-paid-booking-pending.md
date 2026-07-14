# Payment Paid but Booking Not Confirmed

## Purpose

Reconcile a provider-paid transaction while preserving signature and integrity checks.

## Symptoms

PayMongo shows paid, but booking remains approved/payment-pending and user lacks confirmation.

## Impact

Customer uncertainty, venue allocation risk, and missing financial documents.

## Preconditions

Provider event/payment/checkout ID, booking ID, amount/currency, timestamps, environment.

## Safety warnings

Never set booking `confirmed` directly. Do not trust screenshots or return URL alone.

## Investigation steps

1. Verify provider event authenticity/status in dashboard and webhook delivery outcome.
2. Inspect event claim, payment attempt/transaction, booking state, amount/currency/reference.
3. Check signature rejection, delivery outage, reconciliation error, or state conflict.

## Diagnostic commands

```bash
rg -n "reconcil|confirm_booking|payment_pending" apps/web/src/features/payments supabase/migrations
pnpm --filter @venora/web test -- paymongo
```

## Expected evidence

Verified provider settlement and exact point where internal processing stopped.

## Resolution steps

Correct endpoint/config/code, then replay the original signed provider event or invoke
the approved idempotent reconciliation path using provider identifiers.

## Validation

Booking confirms once; transaction, receipt/invoice, commission, audit, and notifications agree.

## Rollback or recovery

If booking cannot be honored, coordinate an approved provider refund and cancellation history.

## Escalation criteria

Any production paid-but-unfulfilled case, capacity conflict, or mismatch in amount/reference.

## Required secrets or permissions

PayMongo read/replay, payment/booking read, authorized incident/finance operator.

## Related documentation

[Payments](../payments.md), [bookings](../bookings.md), and
[receipt/invoice](14-missing-payment-documents.md).
