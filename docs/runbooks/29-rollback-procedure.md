# Rollback Procedure

## Purpose

Restore a known-good application state or execute an approved forward database recovery.

## Symptoms

New release causes material regression and a focused roll-forward is not safer/faster.

## Impact

Continued release risks users/data; rollback may face schema/provider incompatibility.

## Preconditions

Incident approval, bad and target SHAs/deployments, migration/provider changes, recovery owner.

## Safety warnings

Never `git reset --hard`/force-push shared history, reset production database, delete migrations,
or assume schema automatically rolls back with application code.

## Investigation steps

1. Compare bad/target app database and environment compatibility.
2. Identify writes made since release and provider/webhook/secret changes.
3. Choose Vercel known-good redeploy, focused revert commit, feature containment, or forward DB repair.

## Diagnostic commands

```bash
git log --oneline --decorate -20 main
git diff <known-good-sha>..<bad-sha> -- apps packages supabase package.json
supabase migration list --linked
```

## Expected evidence

Approved target, compatibility assessment, affected data window, exact recovery actions and owners.

## Resolution steps

Redeploy verified compatible app or merge a reviewed revert commit. For schema, use approved
forward migration/restore plan. Reconcile provider events and preserve audit history.

## Validation

Deployed SHA/config/schema align; safe smoke and negative checks pass; incident metrics stabilize.

## Rollback or recovery

If rollback worsens impact, restore the newer app and move to a forward fix under incident control.

## Escalation criteria

Incompatible/destructive migration, data loss, payment/auth/security impact, or unknown write set.

## Required secrets or permissions

Release/incident approval, Vercel deployment access, database owner for schema recovery.

## Related documentation

[Deployment](../deployment.md), [migration failure](03-supabase-migration-failure.md), and
[incident triage](28-production-incident-triage.md).
