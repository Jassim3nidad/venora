# Missing RLS Policy

## Purpose

Safely add a required row policy without opening broader access.

## Symptoms

An intended role has no policy, or a new table lacks explicit RLS protection.

## Impact

Access is denied, or—if RLS is disabled/data privileged—rows may be exposed.

## Preconditions

Know table, operation, role, tenant/ownership rule, and expected negative cases.

## Safety warnings

Do not disable RLS, grant broad table access, or use the service role as a UI fix.

## Investigation steps

1. Inspect migration history, RLS enablement, policies, grants, and server guard.
2. Reproduce as intended user and a different-tenant user.
3. Decide whether a policy is missing or application identity/context is wrong.

## Diagnostic commands

```bash
rg -n "CREATE POLICY|ENABLE ROW LEVEL SECURITY|GRANT" supabase/migrations
supabase migration list --linked
```

## Expected evidence

Exact absent/incorrect policy and positive/negative authorization matrix.

## Resolution steps

Add a focused forward migration enabling RLS and the narrow `USING`/`WITH CHECK`
policy. Review function grants and indexes used by policy predicates.

## Validation

Expected user succeeds; anon, wrong role, and other tenant fail; app tests pass.

## Rollback or recovery

If policy overexposes data, contain access and apply an immediate restrictive
forward migration; preserve audit evidence.

## Escalation criteria

Any production exposure possibility, privileged table, or ambiguous ownership.

## Required secrets or permissions

Schema read; database-owner approval to migrate; dedicated multi-tenant fixtures.

## Related documentation

[Authorization](../authorization.md), [database](../database.md), and
[exposure runbook](07-cross-account-exposure-suspicion.md).
