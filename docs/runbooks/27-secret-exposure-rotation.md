# Secret Exposure or Secret Rotation

## Purpose

Contain an exposed credential or perform planned rotation with dependency evidence.

## Symptoms

Secret appears in Git/logs/browser/build/output, provider alerts, or scheduled rotation is due.

## Impact

Unauthorized database, payment, email, push, AI, deployment, or account access.

## Preconditions

Identify secret type/version, environments, exposure time/location, dependents, and incident owner.

## Safety warnings

Do not paste the value, commit its replacement, assume deleting a file erases Git history,
or rotate one side of a webhook/VAPID pair without a transition plan.

## Investigation steps

1. Contain access and preserve redacted evidence/audit logs.
2. Determine exposure scope: Git history, build artifact, browser, logs, ticket, provider.
3. Inventory every authorized consumer/environment and provider activity since exposure.

## Diagnostic commands

```bash
git status --short
git diff --cached
git log --all --oneline --decorate -20
rg -n "NEXT_PUBLIC_.*(SECRET|SERVICE)|BEGIN (RSA|OPENSSH) PRIVATE KEY" .
```

## Expected evidence

Secret identifier/type (not value), exposure window, consumers, suspicious activity, rotation checklist.

## Resolution steps

Revoke/rotate at provider, update authorized server/Edge/Vercel scopes, redeploy/restart,
coordinate webhook endpoint or VAPID subscription changes, and test each dependent feature.
Use approved history-rewrite tooling only when required and coordinated; rotation remains mandatory.

## Validation

Old credential fails, new credential works only in intended scopes, browser bundles/history/diff are clean,
and provider audit shows no unresolved misuse.

## Rollback or recovery

Do not restore compromised credential. Roll forward to another new credential if rotation fails.

## Escalation criteria

Any production/service-role/payment/private-key exposure or suspicious access.

## Required secrets or permissions

Security incident lead and provider/env/deployment rotators with least privilege.

## Related documentation

[Security policy](../../SECURITY.md), [environment variables](../environment-variables.md),
and [incident triage](28-production-incident-triage.md).
