# Supabase Migration Failure

## Purpose

Contain and recover from a failed local or hosted schema migration.

## Symptoms

CLI/SQL error, partial schema, migration-history disagreement, or app failures.

## Impact

Schema can differ from code; production writes or authorization may be unsafe.

## Preconditions

Confirm project/environment, failing file/version, operator, and exact command.

## Safety warnings

Stop. Never reset production, rerun blindly, delete/rename applied files, or
repair history without database-owner approval. The `0680` rename and duplicate
`071` are known.

## Investigation steps

1. Preserve full redacted error and migration/history output.
2. Determine transaction/statement commit state and objects changed.
3. Compare local files with the hosted migration table and schema evidence.
4. Reproduce on an isolated copy before planning a forward repair.

## Diagnostic commands

```bash
supabase migration list --linked
supabase db push --dry-run --linked
```

## Expected evidence

Project ref (redacted as needed), applied/pending versions, failed SQL line,
object state, locks, and isolated reproduction.

## Resolution steps

Create/review a forward corrective migration or safely retry an uncommitted
idempotent change. Obtain production approval, apply once, and record evidence.

## Validation

History/schema agree; functions/grants/RLS/policies pass positive and negative
checks; types, tests, and build pass.

## Rollback or recovery

Use transaction rollback if still open; otherwise approved forward repair or
restore plan. There is no universal automatic down migration.

## Escalation criteria

Production/partial commit, data loss, blocked writes, auth/RLS impact, or unknown
history state.

## Required secrets or permissions

Linked project read; database-owner approval/write for any hosted correction.

## Related documentation

[Migrations](../migrations.md), [database](../database.md), and
[rollback](29-rollback-procedure.md).
