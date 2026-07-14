# Migration Applied but Types Are Stale

## Purpose

Regenerate TypeScript database types from a migration-complete local schema.

## Symptoms

Missing table/RPC/type fields, casts, or compiler errors after a migration.

## Impact

Code can hide schema drift or fail builds; hand-written casts reduce safety.

## Preconditions

All approved migrations must apply successfully to disposable/local Supabase.

## Safety warnings

`pnpm db:types` overwrites a generated file. Do not hand-edit it or generate from
an incomplete/production schema. Resolve the `0680` rename and duplicate `071`
history first.

## Investigation steps

1. Compare migration definition to `packages/database/types/generated.ts`.
2. Confirm local migration history is complete and schema objects exist.
3. Record the generated diff separately from application edits.

## Diagnostic commands

```bash
supabase start
supabase db reset --local
pnpm db:types
git diff -- packages/database/types/generated.ts
```

## Expected evidence

Successful local reset, expected new schema symbols, reviewed generated-only diff.

## Resolution steps

Regenerate once from the complete local database, review unexpected removals,
then update source consumers only where the true schema changed.

## Validation

Run `pnpm type-check`, `pnpm test`, and `pnpm build`.

## Rollback or recovery

If source schema was incomplete, do not commit output; restore by regenerating
from the known-complete schema rather than manually editing.

## Escalation criteria

Local history cannot reproduce hosted schema or generation removes broad domains.

## Required secrets or permissions

Local Docker/Supabase only; no production credential required.

## Related documentation

[Database](../database.md), [migrations](../migrations.md), and
[repository structure](../repository-structure.md).
