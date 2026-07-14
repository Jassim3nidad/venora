# Branch Protection

Configure a branch ruleset for `main` in GitHub. Repository files cannot create
or prove these administrator settings.

## Required settings

- Require a pull request before merge; at least one approval.
- Dismiss stale approvals after new commits.
- Require review from Code Owners when a CODEOWNERS policy is later added.
- Require conversation resolution.
- Require branches to be up to date before merge.
- Block force pushes and branch deletion.
- Do not allow bypass except a documented break-glass role.
- Require signed commits if the team can support key lifecycle operations.

## Required status checks

Select these check names after their first successful run:

- `CI / Static quality and contracts`
- `CI / Automated tests`
- `CI / Production build`
- `Security / Dependency review`
- `Security / Production dependency audit`
- `Security / Gitleaks history scan`
- `Security / CodeQL JavaScript/TypeScript`

Scheduled or manual hosted workflows are not PR status checks. Their evidence is
a release approval requirement for changes that need hosted behavior.

## Verification

Use a test PR to confirm direct pushes, force pushes, missing approvals, stale
branches, unresolved conversations, and failed checks are blocked. Record the
ruleset URL or exported settings in the release evidence without copying tokens
or private data.

If the repository plan does not support a requested protection, record that
control as `BLOCKED` and use the narrowest temporary manual control. Do not claim
the branch is protected until the GitHub settings prove it.
