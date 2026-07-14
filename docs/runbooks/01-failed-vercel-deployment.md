# Failed Vercel Deployment

## Purpose

Restore a failed preview or production build without masking the cause.

## Symptoms

Vercel shows failed install/build/deploy, or the expected URL is unavailable.

## Impact

Preview is blocked or production remains on the prior deployment.

## Preconditions

Know environment, expected commit, Vercel project, and failure timestamp.

## Safety warnings

Do not change production secrets, migrations, or build settings as experiments.

## Investigation steps

1. Confirm Vercel source commit/branch and first failing log line.
2. Compare Node/pnpm, root, install, and build settings to repository scripts.
3. Reproduce the exact commit locally with intended non-secret env shape.

## Diagnostic commands

```bash
git rev-parse HEAD
pnpm install --frozen-lockfile
pnpm type-check
pnpm build
```

## Expected evidence

Source SHA, Vercel log URL/ID, failing phase, local result, and config diff.

## Resolution steps

Fix the smallest source/config cause, validate, push a focused commit, and
redeploy. Correct dashboard settings only after comparing a working preview.

## Validation

Build passes; Vercel shows expected SHA; safe public and auth smoke checks pass.

## Rollback or recovery

Keep/restore the last known-good deployment if the new release is unsafe.

## Escalation criteria

Production outage, platform-wide Vercel failure, or unclear secret/schema impact.

## Required secrets or permissions

Repository read; Vercel deployment/log access. No secret values in incident notes.

## Related documentation

[Deployment](../deployment.md), [build failure](26-production-build-failure.md),
and [rollback](29-rollback-procedure.md).
