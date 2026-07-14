# Rollback

Rollback depends on the failed layer. Stop further deployment first, preserve
redacted evidence, name an incident owner, and communicate user impact.

| Layer                        | Preferred recovery                                                       | Avoid                                       |
| ---------------------------- | ------------------------------------------------------------------------ | ------------------------------------------- |
| Web application              | Restore/redeploy last verified Git commit through Vercel Git integration | Unreviewed local CLI deploy                 |
| Backward-compatible database | Keep schema; deploy compatible app or forward-fix                        | Deleting/renaming applied migrations        |
| Data/schema corruption       | Approved forward repair or verified restore procedure                    | `supabase db reset`, ad hoc destructive SQL |
| Edge Function                | Deploy last verified function commit with confirmed JWT mode             | Bulk deploy/prune without inventory         |
| Secret exposure              | Revoke/rotate, update protected scope, redeploy consumers                | Merely deleting Git content                 |
| Provider incident            | Disable affected feature/provider path and use provider recovery         | Retrying real charges/webhooks blindly      |

## Procedure

1. Record deployed and intended commit, environment, migrations/functions, and
   first failing check.
2. Decide whether application rollback is compatible with the current schema.
3. Obtain the same protected-environment approval used for release.
4. Execute the smallest recovery action.
5. Repeat deployment identity, auth/RBAC, booking/payment, Storage, and log checks
   relevant to the failure.
6. Generate a new manifest and retain both failed and recovered evidence.

See the existing [rollback procedure](runbooks/29-rollback-procedure.md),
[unexpected production commit](runbooks/02-unexpected-production-commit.md),
and [Supabase migration failure](runbooks/03-supabase-migration-failure.md).
