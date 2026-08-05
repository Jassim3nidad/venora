# Email-Verification Failure

## Purpose

Restore confirmation/resend flow without account enumeration or unsafe manual activation.

## Symptoms

Verification email absent, link expired, callback fails, or profile remains unverified.

## Impact

New user cannot complete sign-in/onboarding.

## Preconditions

Environment, dedicated account, send/click timestamps, redacted provider/auth errors.

## Safety warnings

Do not reveal account existence, expose tokens, or mark production email verified manually.

## Investigation steps

1. Confirm Supabase email provider/template, site/redirect URLs, rate limits, and message delivery.
2. Check resend action response and callback exchange without logging link tokens.
3. Inspect profile-sync trigger/status only after Auth reports confirmed identity.

## Diagnostic commands

```bash
rg -n "verify-email|resend|email_confirm" apps/web supabase/migrations
pnpm type-check
```

## Expected evidence

Failure at send, provider delivery, link expiry, callback, or profile synchronization.

## Resolution steps

Correct provider/URL/code, request one fresh verification email, and let canonical callback synchronize state.

## Validation

Dedicated account verifies once, logs in, receives correct role/status, and expired link fails safely.

## Rollback or recovery

Restore known-good auth config; ask users to request fresh links after recovery.

## Escalation criteria

Production-wide failure, wrong account activation, enumeration, or token disclosure.

## Required secrets or permissions

Supabase Auth configuration/log read, mail-provider evidence, dedicated test account.

## Related documentation

[Authentication](../authentication.md), [callback](20-auth-callback-failure.md), and
[SMTP delivery](16-smtp-delivery-failure.md).
