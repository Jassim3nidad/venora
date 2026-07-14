# PayMongo Checkout Creation Failure

## Purpose

Restore checkout creation without duplicating attempts or changing booking data.

## Symptoms

Approved booking cannot open checkout; gateway/action returns an error.

## Impact

Customer cannot pay; booking may be `approved` or temporarily `payment_pending`.

## Preconditions

Booking ID, attempt/reference, environment, timestamp, and redacted provider error.

## Safety warnings

Use test mode outside production. Never log keys, retry concurrently, or manually
set booking to confirmed.

## Investigation steps

1. Verify booking is approved with valid total/deposit and customer ownership.
2. Inspect payment attempt, checkout claim, provider response, and app origin.
3. Confirm key environment/mode and PayMongo availability without printing key.

## Diagnostic commands

```bash
pnpm --filter @venora/web test -- paymongo.gateway.test.ts
pnpm type-check
```

## Expected evidence

Single attempt, state before/after, provider status/code, and no settlement event.

## Resolution steps

Correct configuration/request data, ensure failed claim returns conditionally to
`approved`, then retry once through the normal checkout use case.

## Validation

One hosted test checkout opens; booking/attempt/reference are correct; cancellation
returns safely; no duplicate charge/session is applied.

## Rollback or recovery

Leave booking approved for later retry; disable checkout if provider behavior is unsafe.

## Escalation criteria

Production-wide outage, possible duplicate charges, state stuck, or provider incident.

## Required secrets or permissions

Booking/payment read, PayMongo dashboard test access, server env access if authorized.

## Related documentation

[Payments](../payments.md), [booking lifecycle](../bookings.md), and
[paid pending](13-paid-booking-pending.md).
