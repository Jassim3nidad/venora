# Cross-Account Data Exposure Suspicion

## Purpose

Contain and investigate possible tenant/user boundary failure.

## Symptoms

A user sees another customer's booking, document, venue, supplier inquiry,
notification, analytics, or export data.

## Impact

Potential security/privacy incident with notification and disclosure obligations.

## Preconditions

Record reporter, environment, resource IDs, timestamps, route, and redacted proof.

## Safety warnings

Treat as high severity. Do not explore unrelated records, delete evidence, paste
personal data publicly, or “test” with production users.

## Investigation steps

1. Contain affected route/export/object if exposure is credible.
2. Preserve logs, audit rows, deployment SHA, policy/grant/function definitions.
3. Reproduce minimally in isolated fixtures with two tenants.
4. Trace server guard, privileged client use, RLS/Storage policy, cache, and URL.

## Diagnostic commands

```bash
git rev-parse HEAD
rg -n "service.role|SERVICE_ROLE|createAdminClient|CREATE POLICY" apps/web supabase
git log --oneline -- supabase/migrations apps/web/src apps/web/app
```

## Expected evidence

Affected scope/time/data classes, access path, actor, source SHA, and root boundary.

## Resolution steps

Restrict/disable the path, apply the smallest server/RLS/Storage fix, rotate any
exposed secret, invalidate unsafe caches/links, and follow incident disclosure policy.

## Validation

Authorized positive case passes; all cross-account/anon/role negatives fail in
isolated and deployed environments; audit logs show no ongoing exposure.

## Rollback or recovery

Keep the path disabled or restore a known restrictive release until validated.

## Escalation criteria

Immediately escalate credible production exposure, sensitive documents,
payments, credentials, or uncertain scope.

## Required secrets or permissions

Incident lead, security/privacy owner, logs/audit/policy access; no public secrets.

## Related documentation

[Security policy](../../SECURITY.md), [authorization](../authorization.md), and
[incident triage](28-production-incident-triage.md).
