# Unexpected RLS Denial

## Purpose

Restore intended access while preserving tenant and role boundaries.

## Symptoms

Authenticated query/upload returns permission denied or empty rows unexpectedly.

## Impact

User workflow is blocked; a rushed bypass could create data exposure.

## Preconditions

Capture user role/status, resource owner/tenant, operation, and request time.

## Safety warnings

Do not disable RLS, switch the browser to service-role access, or broaden policy
before reproducing negative cases.

## Investigation steps

1. Confirm current session/JWT, profile, role, approval, owner, and organization.
2. Identify table/function/Storage policy and direct execute/table grants.
3. Reproduce with intended and other-tenant dedicated fixtures.

## Diagnostic commands

```bash
rg -n "CREATE POLICY|has_admin_permission|SECURITY DEFINER" supabase/migrations apps/web/src
supabase migration list --linked
```

## Expected evidence

One failed predicate/grant/session fact and proof negative access remains denied.

## Resolution steps

Correct identity/context or add a narrow reviewed forward policy/function fix.
Keep equivalent server authorization and audit behavior.

## Validation

Positive caller succeeds; anon/wrong role/other tenant fail; tests/build pass.

## Rollback or recovery

Revert application use of the new path or apply a restrictive forward migration.

## Escalation criteria

Widespread production denial, contradictory policy intent, or exposure risk.

## Required secrets or permissions

Dedicated test identities; schema/policy read; approved migration rights if fixed.

## Related documentation

[Authorization](../authorization.md), [database](../database.md), and
[missing policy](05-missing-rls-policy.md).
