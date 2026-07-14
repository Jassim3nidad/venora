# Emergency Access Review

## Purpose

Grant, monitor, and remove temporary elevated access during an incident.

## Symptoms

Normal least-privilege roles cannot perform an approved urgent diagnostic/recovery action.

## Impact

Delay may extend incident; excess access increases security and audit risk.

## Preconditions

Active incident/change record, named requester/approver, exact capability, environment, expiration.

## Safety warnings

No shared accounts, permanent role escalation, credential transmission in chat, or unlogged service-role use.

## Investigation steps

1. Confirm normal role truly cannot perform the action and identify narrowest permission.
2. Verify requester identity, approver independence, duration, commands/data scope, and logging.
3. Prefer provider time-bound roles or supervised action by an existing authorized operator.

## Diagnostic commands

```bash
git rev-parse HEAD
git status --short
rg -n "admin_user_roles|admin_role_permissions|has_admin_permission" supabase/migrations apps/web/src
```

## Expected evidence

Approval, reason, exact privilege, start/expiry, actions/logs, data accessed, and revocation proof.

## Resolution steps

Grant the minimum temporary permission through the approved system, monitor actions, revoke at
task/expiry, rotate issued credentials if appropriate, and review audit logs.

## Validation

Emergency action succeeded; access is removed; user cannot repeat it; audit record is complete.

## Rollback or recovery

Revoke immediately, terminate sessions/tokens, and rotate affected credentials if scope exceeded.

## Escalation criteria

Unapproved request, inability to audit/revoke, sensitive data access, or suspected misuse.

## Required secrets or permissions

Incident commander, independent approver, identity/admin platform operator, security review.

## Related documentation

[Authorization](../authorization.md), [security policy](../../SECURITY.md), and
[incident triage](28-production-incident-triage.md).
