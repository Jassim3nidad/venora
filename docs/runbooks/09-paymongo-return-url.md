# Incorrect PayMongo Return-to-Merchant URL

## Purpose

Correct success/cancel URLs without treating browser return as payment proof.

## Symptoms

Checkout returns to localhost, wrong preview/domain, 404, or another booking path.

## Impact

Poor recovery/confirmation UX; payment may still settle by webhook.

## Preconditions

Checkout ID, environment, observed/expected URL, deployment SHA, and payment state.

## Safety warnings

Do not replay payment, edit booking status, or expose provider secrets in URLs/logs.

## Investigation steps

1. Inspect stored checkout return URLs and deployment origin variables.
2. Confirm `NEXT_PUBLIC_APP_URL`/server origin for the exact Vercel environment.
3. Verify expected `/bookings/{id}/confirmation` and `/bookings/{id}/payment` paths.

## Diagnostic commands

```bash
rg -n "NEXT_PUBLIC_APP_URL|success_url|cancel_url|confirmation" apps/web/src apps/web/app
pnpm build
```

## Expected evidence

Origin source, generated URLs, checkout environment, and independent webhook state.

## Resolution steps

Set the correct environment-specific origin, rebuild/redeploy, and create a new
test-mode checkout. Keep old paid events reconcilable by webhook.

## Validation

Test success/cancel returns reach the right booking and confirmation reflects
database settlement, not URL query state.

## Rollback or recovery

Give affected users the authenticated booking URL; revert to known-good origin config.

## Escalation criteria

Production payments are stranded, redirect crosses an untrusted domain, or data leaks.

## Required secrets or permissions

Vercel env/deploy access and PayMongo test dashboard; no key values in evidence.

## Related documentation

[Environment variables](../environment-variables.md), [payments](../payments.md),
and [deployment](../deployment.md).
