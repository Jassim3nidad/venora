# Release Manifest

`pnpm release:manifest` writes `artifacts/ci/release-manifest.json` and Markdown.
Artifacts are runtime evidence and are not committed.

## Fields

| Field                        | Meaning                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| `repository`, `branch`       | Source repository and release branch                         |
| `releaseCommit`              | Full immutable Git SHA                                       |
| `buildIdentifier`            | GitHub run/attempt or explicit local marker                  |
| `workflowRun`                | Non-secret workflow-run reference                            |
| `tier`                       | Preview, staging, production, or unassigned                  |
| `protectedOperation`         | Operation, change reference, function, and explicit JWT mode |
| `repositoryChecks`           | Recorded deterministic test result                           |
| `deploymentVerification`     | Vercel state/commit/route verification                       |
| `hostedEnvironment`          | Non-production guard result                                  |
| `hostedStorageRls`           | Behavioral venue-media RLS result                            |
| `migrations`                 | Count, latest files, 0680 rename, and duplicate-071 state    |
| `edgeFunctionsDeployed`      | Exact functions operated on in this run                      |
| `vercelDeploymentIdentifier` | Vercel deployment evidence when verified                     |
| `productionUrl`              | Verified production origin, production tier only             |
| `testSummary`                | Discovered/executed/pass/fail/skip/block records             |
| `blockedChecks`              | Visible unexecuted or unsatisfied release checks             |
| `knownLimitations`           | Release-impacting debt retained with the evidence            |
| `releaseApprover`            | Approver when supplied by the protected process              |
| `rollbackTarget`             | Previous release/deployment when supplied                    |
| `rollback`                   | Canonical recovery guide                                     |

The manifest contains no credentials, account identifiers, object paths, or
personal data. `BLOCKED`/`NOT_RECORDED` values must remain visible; do not edit
them to `PASS`.

## Retention

GitHub workflow artifacts use seven-day retention. Copy approved release
manifests into the team's access-controlled release record before expiry. Link
the workflow run, Vercel deployment, migration plan/apply evidence, approver,
change reference, incidents, and remaining risks. Do not paste secrets or raw
production records.
