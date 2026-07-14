# PayMongo Webhook Signature Failure

## Purpose

Restore verified webhook processing without accepting untrusted events.

## Symptoms

PayMongo deliveries receive signature rejection; paid booking remains unconfirmed.

## Impact

Settlement is delayed; weakening verification risks fraudulent confirmation.

## Preconditions

Provider event/delivery ID, endpoint, timestamp, mode, and redacted response/log.

## Safety warnings

Never disable signature verification, log the full secret/signature, or parse a
modified body before verification.

## Investigation steps

1. Confirm event reached the exact HTTPS endpoint and environment.
2. Confirm active endpoint secret matches server scope and test/live mode.
3. Inspect raw-body preservation, signature timestamp tolerance, proxy rewriting,
   and secret-rotation overlap.

## Diagnostic commands

```bash
rg -n "PAYMONGO_WEBHOOK_SECRET|signature|raw" apps/web/app/api apps/web/src/features/payments
pnpm --filter @venora/web test -- paymongo
```

## Expected evidence

Delivery ID/time, endpoint/mode, verification reason, deployment SHA, secret
version identifier (not value), and whether event is unprocessed.

## Resolution steps

Correct endpoint/server secret or raw-body handling, deploy, then request a
provider retry/replay of the original event. Let idempotent claim/reconciliation run.

## Validation

Valid test event succeeds once; altered signature/body fails; settlement evidence matches.

## Rollback or recovery

Keep verification rejecting until corrected; use provider evidence/customer support,
not manual confirmation, during delay.

## Escalation criteria

Production paid events blocked, suspected secret compromise, or forged event accepted.

## Required secrets or permissions

PayMongo webhook dashboard, server env/deployment logs, payment read; authorized rotator.

## Related documentation

[API webhooks](../api/webhooks.md), [payments](../payments.md), and
[secret rotation](27-secret-exposure-rotation.md).
