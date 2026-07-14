# Production-Build Failure

## Purpose

Reproduce and repair `next build --webpack`/workspace production build failures.

## Symptoms

`pnpm build` or Vercel build exits nonzero, emits route/type/bundle errors, or hangs.

## Impact

Release is blocked; production should remain on last good build.

## Preconditions

Commit, Node/pnpm, build environment, first error, local/Vercel result.

## Safety warnings

Do not disable checks, expose secrets to client code, or change webpack mode without scoped proof.

## Investigation steps

1. Install from lockfile and reproduce at repository root.
2. Run type-check and identify first route/import/env/render failure.
3. Compare Vercel root/build command and platform-provided environment.

## Diagnostic commands

```bash
pnpm install --frozen-lockfile
pnpm type-check
pnpm build
pnpm --filter @venora/web run analyze
```

## Expected evidence

First deterministic failure, affected route/module, environment/config difference, and source SHA.

## Resolution steps

Apply the smallest code/config fix, preserve `next build --webpack`, and add targeted regression test when possible.

## Validation

Type-check, full tests, build, docs validators, and a preview smoke test pass.

## Rollback or recovery

Keep last known-good deployment; revert the causative commit if release urgency requires.

## Escalation criteria

Framework/toolchain regression, production outage, or fix requires broad architecture change.

## Required secrets or permissions

Repository; Vercel logs/settings for remote-only failure. Do not copy secret values.

## Related documentation

[Testing](../testing.md), [deployment](../deployment.md), and
[failed Vercel deployment](01-failed-vercel-deployment.md).
