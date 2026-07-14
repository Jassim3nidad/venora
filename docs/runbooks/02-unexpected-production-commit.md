# Unexpected Production Commit

## Purpose

Identify and correct production serving a commit other than the approved release.

## Symptoms

Vercel source SHA, UI/version behavior, `main`, and release record disagree.

## Impact

Unreviewed/stale code may be live; schema and app compatibility may be unknown.

## Preconditions

Obtain approved SHA, observed SHA, URL, environment, and deployment timestamp.

## Safety warnings

Do not force-push, rewrite Git history, or deploy another unknown commit.

## Investigation steps

1. Compare local, remote, approved, and Vercel source SHAs.
2. Inspect production-branch and Git integration settings in Vercel.
3. Determine whether an alias, rollback, cache, or manual deployment is active.

## Diagnostic commands

```bash
git fetch origin main
git rev-parse main
git rev-parse origin/main
git log --oneline --decorate -10 main
git ls-remote origin refs/heads/main
```

## Expected evidence

Four SHAs, deployment/alias actor and time, branch setting, and audit-log entry.

## Resolution steps

Contain risky traffic if needed, select the approved compatible deployment, and
promote/redeploy it through the authorized Vercel flow. Correct integration only
after root cause is known.

## Validation

Production and Vercel report the approved SHA; smoke tests and dependencies pass.

## Rollback or recovery

Restore the last verified deployment; follow database recovery separately if
the unexpected commit applied incompatible changes.

## Escalation criteria

Unknown actor, possible compromise, database mutation, or customer impact.

## Required secrets or permissions

Git remote read, Vercel project/audit access, incident lead for traffic changes.

## Related documentation

[Deployment](../deployment.md), [incident triage](28-production-incident-triage.md),
and [rollback](29-rollback-procedure.md).
