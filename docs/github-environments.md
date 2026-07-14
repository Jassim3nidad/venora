# GitHub Environments

Create `preview`, `staging`, and `production` environments. Limit deployment
branches/tags to `main` for every environment. Environment secrets must not be
duplicated as repository secrets unless a documented workflow requires it.

| Environment  | Reviewers                    | Wait timer  | Purpose                                        |
| ------------ | ---------------------------- | ----------- | ---------------------------------------------- |
| `preview`    | Maintainer optional          | None        | Read-only deployment identity verification     |
| `staging`    | Release maintainer           | None        | Hosted E2E/RLS and rehearsal operations        |
| `production` | Independent release approver | Team policy | Production verification and Supabase mutations |

## Protection

- Configure required reviewers for staging and production.
- Prevent self-review for production where supported.
- Restrict environment access to the smallest release group.
- Keep production and staging Supabase project refs different.
- Rotate credentials after membership or provider access changes.
- Do not expose protected secrets to PR-triggered workflows.

The protected operations workflow uses an environment selected from a fixed
choice. A missing environment, reviewer, secret, variable, or target guard must
block the run; it must not be converted to a green skip.

## External verification

After configuration, inspect a manual staging run and a harmless production
verification run. Confirm the job waits for approval and receives only the
selected environment's values. Dashboard state remains unverified until this is
performed by an authenticated administrator.
