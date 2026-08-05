# SMTP Email Delivery Failure

## Purpose

Restore email delivery without duplicating domain events or leaking recipient data.

## Symptoms

In-app notification exists but email is failed, rejected, bounced, or absent.

## Impact

Users miss booking/payment/review/admin messages while core state may be correct.

## Preconditions

Notification/delivery ID, recipient (redacted), template/type, provider time/status.

## Safety warnings

Do not log SMTP credentials or resend bulk mail. Use a dedicated test recipient for validation.

## Investigation steps

1. Inspect in-app record, preferences, email delivery record, attempts, and provider ID.
2. Confirm key presence, verified sender/domain, recipient/bounce/suppression, provider status.
3. Separate message rendering failure from provider/network failure.

## Diagnostic commands

```bash
node scripts/validate-env.mjs
pnpm run test:notifications:providers
```

## Expected evidence

One failed stage/error, config scope/version, provider event, and preference decision.

## Resolution steps

Correct key/sender/domain/template or provider issue, then retry one failed delivery through
the delivery-record path while respecting current preferences.

## Validation

Dedicated test email delivers; delivery record/provider ID update once; no duplicate event.

## Rollback or recovery

Disable failing email channel temporarily while retaining in-app notifications and evidence.

## Escalation criteria

Production-wide delivery failure, domain compromise, high bounce rate, or sensitive leak.

## Required secrets or permissions

SMTP provider/server env access and notification read/retry permission.

## Related documentation

[Notifications](../notifications.md), [environment variables](../environment-variables.md),
and [secret rotation](27-secret-exposure-rotation.md).
