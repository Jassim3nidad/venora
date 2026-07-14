# OpenAPI Validation Failure

## Purpose

Restore deterministic API coverage and semantic validation after a contract change.

## Symptoms

Generation diff, coverage below 31/31 baseline, broken links/tables, or Redocly error/warning drift.

## Impact

Consumers receive stale/invalid contracts; documentation commit/build is blocked.

## Preconditions

Know changed handlers/actions/contracts and baseline warnings.

## Safety warnings

Do not weaken validator rules, hand-edit generated JSON as the only fix, or hide an operation.

## Investigation steps

1. Regenerate and inspect exact OpenAPI diff.
2. Compare HTTP inventory, route handler implementation, schemas/responses/security.
3. Separate seven known non-blocking warnings from new errors/warnings.

## Diagnostic commands

```bash
pnpm docs:generate
pnpm docs:validate
pnpm docs:semantic:validate
git diff -- docs/api
```

## Expected evidence

Named missing/invalid operation/schema/link and deterministic regenerated diff.

## Resolution steps

Correct generator source/API docs or implementation contract as scoped, regenerate, and review.

## Validation

Coverage returns to expected inventory; semantic validator has no new blocking findings.

## Rollback or recovery

Revert unapproved contract/doc change and regenerate from known-good source.

## Escalation criteria

Breaking API change, security-scheme disagreement, or validator/generator cannot represent implementation.

## Required secrets or permissions

Repository only; no external credentials.

## Related documentation

[API documentation](../api/README.md), [testing](../testing.md), and
[documentation index](../README.md).
