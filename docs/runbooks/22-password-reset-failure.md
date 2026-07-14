# Password-Reset Failure

## Purpose

Restore recovery email, session, and password update safely.

## Symptoms

Recovery email absent, link redirects wrong, reset session missing/expired, update rejected.

## Impact

User cannot recover access; insecure workaround could compromise an account.

## Preconditions

Environment, dedicated account, request/click time, redirect URL, redacted error.

## Safety warnings

Never ask for old/new passwords, reveal account existence, reuse links, or manually set a production password.

## Investigation steps

1. Verify generic recovery response, Supabase mail/provider delivery, redirect allow-list.
2. Inspect callback/recovery session cookies and reset-page update call.
3. Confirm password policy and link one-time/expiry behavior.

## Diagnostic commands

```bash
rg -n "forgot-password|reset-password|resetPasswordForEmail|updateUser" apps/web
pnpm type-check
```

## Expected evidence

Failure at request, email delivery, redirect/session exchange, policy, or update.

## Resolution steps

Correct config/code, invalidate old links if needed, and request a fresh recovery link for a dedicated test account.

## Validation

Fresh reset succeeds, old password fails, new password works, token cannot be reused, no enumeration occurs.

## Rollback or recovery

Restore known-good auth deployment/config; keep recovery unavailable rather than weakening verification.

## Escalation criteria

Account takeover possibility, token leak, wrong-account reset, or production-wide outage.

## Required secrets or permissions

Supabase Auth log/config access and dedicated non-production account.

## Related documentation

[Authentication](../authentication.md), [callback](20-auth-callback-failure.md), and
[security policy](../../SECURITY.md).
