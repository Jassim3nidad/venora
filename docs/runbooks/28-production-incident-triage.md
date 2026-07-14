# Production Incident Triage

## Purpose

Establish severity, contain impact, preserve evidence, and coordinate recovery.

## Symptoms

Availability, security, data, payment, auth, deployment, or provider anomaly affects production.

## Impact

Varies from degraded workflow to financial/privacy/security harm.

## Preconditions

Name incident lead/scribe, start time, environment, observed symptoms, reporter, source SHA.

## Safety warnings

Do not speculate publicly, expose personal data/secrets, destroy evidence, reset production,
or make unrecorded privileged changes.

## Investigation steps

1. Classify severity, affected users/data/money, and whether security/privacy is involved.
2. Stabilize: disable affected path, preserve known-good traffic, or pause retries/webhooks as justified.
3. Build timeline from Vercel/Supabase/provider/audit logs and deployments.
4. Assign focused workstreams and record every decision/change.

## Diagnostic commands

```bash
git rev-parse HEAD
git fetch origin main
git log --oneline --decorate -10 origin/main
git status --short
```

## Expected evidence

Incident ID, scope/severity, source/deployed SHA, timeline, containment state, owners, hypotheses.

## Resolution steps

Apply the smallest approved fix/rollback/forward repair, rotate exposed secrets, reconcile data/payments,
communicate through authorized channels, and schedule root-cause/remediation review.

## Validation

Health and scoped workflow recover; negative/security checks pass; monitoring/audit show stable state.

## Rollback or recovery

Follow [rollback](29-rollback-procedure.md); database/payment actions need domain-specific recovery.

## Escalation criteria

Immediate for production security/privacy, payment error, data loss, widespread outage, or unknown scope.

## Required secrets or permissions

Incident lead; read access to deployments/logs/audits; change permissions only when approved.

## Related documentation

[Deployment](../deployment.md), [security policy](../../SECURITY.md), and
[emergency access](30-emergency-access-review.md).
