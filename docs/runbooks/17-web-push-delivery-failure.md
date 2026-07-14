# Web Push Delivery Failure

## Purpose

Restore push delivery while preserving user permission and subscription safety.

## Symptoms

Subscription fails or delivery record/provider response reports push failure.

## Impact

Users miss timely notifications; in-app/email may still work.

## Preconditions

Notification/delivery ID, browser/platform, subscription status, environment, timestamp.

## Safety warnings

Never expose VAPID private key or force browser permission. Key-pair rotation invalidates subscriptions.

## Investigation steps

1. Check secure context, browser permission, service worker, active endpoint, preference.
2. Confirm VAPID public/private pair and subject belong to the environment.
3. Inspect provider status for expired/gone subscription versus server/config error.

## Diagnostic commands

```bash
node scripts/validate-env.mjs
rg -n "VAPID|push subscription|web-push" apps/web/src apps/web/app supabase/functions
```

## Expected evidence

Permission/subscription state, provider status, delivery attempt, and key version identifier.

## Resolution steps

Correct configuration; remove expired subscriptions; ask the user to resubscribe voluntarily;
retry one eligible delivery only when idempotent.

## Validation

Dedicated browser receives a test push; in-app record remains single; preferences are honored.

## Rollback or recovery

Disable push temporarily and rely on in-app/email; restore prior matching key pair if authorized.

## Escalation criteria

Production-wide key mismatch, suspected key exposure, or unintended recipient delivery.

## Required secrets or permissions

Server env, notification/subscription read, test browser, authorized key rotator.

## Related documentation

[Notifications](../notifications.md), [environment variables](../environment-variables.md),
and [secret rotation](27-secret-exposure-rotation.md).
