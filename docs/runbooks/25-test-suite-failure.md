# Test-Suite Failure

## Purpose

Classify and fix a failing automated test without hiding a regression.

## Symptoms

`pnpm test` fails, hangs, flakes, or baseline count drops.

## Impact

Change cannot be trusted; build/release should stop.

## Preconditions

Commit, command, OS/Node/pnpm, failing test/error, retry history, changed diff.

## Safety warnings

Do not skip/delete/weaken tests, update snapshots blindly, or use production credentials.

## Investigation steps

1. Reproduce the named test in a clean process, then full suite.
2. Compare environment, timezone, mocks, timers, concurrency, fixtures, and dependency drift.
3. Map failure to changed behavior versus pre-existing/flaky infrastructure.

## Diagnostic commands

```bash
pnpm test
pnpm --filter @venora/web test -- <test-name-or-path>
git diff --check
```

## Expected evidence

Deterministic minimal failure or documented flake signature with unchanged baseline proof.

## Resolution steps

Fix production code or test fixture/expectation only when the intended behavior is verified; add regression coverage.

## Validation

Focused test and full suite pass repeatedly; lint/type/build remain passing.

## Rollback or recovery

Revert the causative change or block merge/release until understood.

## Escalation criteria

Data/security/payment/auth behavior, broad nondeterminism, or test cannot run in supported environment.

## Required secrets or permissions

Repository only for Vitest; dedicated test fixtures for explicitly external/E2E suites.

## Related documentation

[Testing](../testing.md), [build failure](26-production-build-failure.md), and
[incident triage](28-production-incident-triage.md).
