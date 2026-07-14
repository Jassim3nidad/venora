# Authentication Callback Failure

## Purpose

Restore Supabase code exchange and safe role-aware redirect.

## Symptoms

Callback errors/loops, session missing, wrong domain/dashboard, or token appears expired.

## Impact

Registration, verification, login/OAuth, or recovery cannot complete.

## Preconditions

Environment, callback URL, auth flow, timestamp, redacted error, deployment SHA.

## Safety warnings

Never log code/token/cookie, allow arbitrary return URLs, or disable secure cookie behavior.

## Investigation steps

1. Compare request origin, `NEXT_PUBLIC_APP_URL`, Supabase site URL and redirect allow-list.
2. Inspect callback code exchange, cookie domain/secure state, proxy session refresh, profile/role resolution.
3. Test a fresh link in the same environment; old links may be one-time/expired.

## Diagnostic commands

```bash
rg -n "auth/callback|exchangeCodeForSession|NEXT_PUBLIC_APP_URL|redirectTo" apps/web
pnpm type-check
```

## Expected evidence

Mismatch or exchange failure stage without token contents, plus expected redirect decision.

## Resolution steps

Correct per-environment origin/allow-list or callback/session code; redeploy and issue a fresh test flow.

## Validation

Fresh verification/login/recovery callback sets session and reaches authorized dashboard; external return URL is rejected.

## Rollback or recovery

Restore last known-good auth config/deployment and direct users to request fresh links.

## Escalation criteria

Production-wide auth outage, session leakage, open redirect, or account cross-over.

## Required secrets or permissions

Supabase Auth URL/config read/write as approved, Vercel env/deploy access, dedicated test account.

## Related documentation

[Authentication](../authentication.md), [environment variables](../environment-variables.md),
and [email verification](21-email-verification-failure.md).
