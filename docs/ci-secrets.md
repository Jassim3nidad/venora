# CI Secrets and Variables

Pull-request workflows receive no Venora/provider credentials. Configure names
below at the narrowest GitHub environment scope. Never commit actual values.

## Environment secrets

| Secret name                                                             | Purpose                     | Workflow                       | Environment             | Required      | Scope                                   | Rotation effect                      | Safe absence behavior                            |
| ----------------------------------------------------------------------- | --------------------------- | ------------------------------ | ----------------------- | ------------- | --------------------------------------- | ------------------------------------ | ------------------------------------------------ |
| `STAGING_SUPABASE_ANON_KEY`                                             | Browser/user RLS client     | Hosted staging verification    | `staging`               | Yes           | Staging public API only                 | Update staging workflow value        | Hosted run is BLOCKED                            |
| `STAGING_SUPABASE_SERVICE_ROLE_KEY`                                     | Fixture lookup/cleanup      | Hosted staging verification    | `staging`               | Yes           | Staging project; high privilege         | Rotate immediately on access change  | Hosted RLS is BLOCKED                            |
| `SUPABASE_STAGING_DB_URL`                                               | Migration/policy assertions | Hosted staging verification    | `staging`               | Yes           | Staging database only                   | Replace after DB credential rotation | Hosted DB check is BLOCKED                       |
| `STAGING_E2E_CUSTOMER_EMAIL`, `STAGING_E2E_CUSTOMER_PASSWORD`           | Customer fixture            | Hosted staging verification    | `staging`               | Yes           | Disposable staging user                 | Reprovision pair                     | E2E is BLOCKED                                   |
| `STAGING_E2E_VENUE_EMAIL`, `STAGING_E2E_VENUE_PASSWORD`                 | Venue-owner fixture         | Hosted staging verification    | `staging`               | Yes           | Disposable staging user                 | Reprovision pair                     | E2E is BLOCKED                                   |
| `STAGING_E2E_COORDINATOR_EMAIL`, `STAGING_E2E_COORDINATOR_PASSWORD`     | Coordinator fixture         | Hosted staging verification    | `staging`               | Yes           | Disposable staging user                 | Reprovision pair                     | E2E is BLOCKED                                   |
| `STAGING_E2E_SUPPLIER_EMAIL`, `STAGING_E2E_SUPPLIER_PASSWORD`           | Supplier fixture            | Hosted staging verification    | `staging`               | Yes           | Disposable staging user                 | Reprovision pair                     | E2E is BLOCKED                                   |
| `STAGING_E2E_SUPERADMIN_EMAIL`, `STAGING_E2E_SUPERADMIN_PASSWORD`       | Super-admin fixture         | Hosted staging verification    | `staging`               | Yes           | Disposable staging user                 | Reprovision pair                     | E2E is BLOCKED                                   |
| `STAGING_E2E_ANALYST_ADMIN_EMAIL`, `STAGING_E2E_ANALYST_ADMIN_PASSWORD` | Analyst-admin fixture       | Hosted staging verification    | `staging`               | Yes           | Disposable staging user                 | Reprovision pair                     | E2E is BLOCKED                                   |
| `STAGING_E2E_FINANCE_ADMIN_EMAIL`, `STAGING_E2E_FINANCE_ADMIN_PASSWORD` | Finance-admin fixture       | Hosted staging verification    | `staging`               | Yes           | Disposable staging user                 | Reprovision pair                     | E2E is BLOCKED                                   |
| `STAGING_RLS_TENANT_A_EMAIL`, `STAGING_RLS_TENANT_A_PASSWORD`           | Organization A member       | Hosted staging verification    | `staging`               | Yes           | Dedicated cross-tenant fixture          | Reprovision pair and venue           | Storage RLS is BLOCKED                           |
| `STAGING_RLS_TENANT_B_EMAIL`, `STAGING_RLS_TENANT_B_PASSWORD`           | Organization B member       | Hosted staging verification    | `staging`               | Yes           | Separate organization fixture           | Reprovision pair and venue           | Storage RLS is BLOCKED                           |
| `STAGING_RLS_NON_MEMBER_EMAIL`, `STAGING_RLS_NON_MEMBER_PASSWORD`       | Authenticated non-member    | Hosted staging verification    | `staging`               | Yes           | No organization membership              | Reprovision pair                     | Negative RLS is BLOCKED                          |
| `VERCEL_TOKEN`                                                          | Read deployment metadata    | Hosted/deployment verification | selected tier           | Yes           | Minimum read access to one project/team | Replace token; rerun verification    | Deployment check is BLOCKED                      |
| `VERCEL_ORG_ID`                                                         | Bind Vercel team            | Hosted/deployment verification | selected tier           | Yes           | Expected team identifier                | Update only after approved rebind    | Deployment check is BLOCKED                      |
| `VERCEL_PROJECT_ID`                                                     | Bind Vercel project         | Hosted/deployment verification | selected tier           | Yes           | Expected project identifier             | Update only after approved rebind    | Deployment check is BLOCKED                      |
| `SUPABASE_ACCESS_TOKEN`                                                 | Supabase management CLI     | Protected Supabase operations  | `staging`, `production` | Yes           | Minimum operator access                 | Rotate/revoke; relink on next run    | Operation is BLOCKED                             |
| `SUPABASE_DB_PASSWORD`                                                  | Migration plan/apply        | Protected Supabase operations  | `staging`, `production` | Database only | Exact target database                   | Rotate DB credential                 | DB operation is BLOCKED; Edge deploy may proceed |

Fixture accounts must be synthetic and non-personal. Do not configure production
service-role/provider keys for pull requests or reuse real customer/staff users.

## Environment variables

| Variable name                     | Purpose                           | Workflow                       | Environment             | Required | Scope                           | Rotation/change effect              | Safe absence behavior           |
| --------------------------------- | --------------------------------- | ------------------------------ | ----------------------- | -------- | ------------------------------- | ----------------------------------- | ------------------------------- |
| `PRODUCTION_BASE_URL`             | Exact production deny/bind origin | Hosted/deployment verification | all verification tiers  | Yes      | One HTTPS origin                | Review after domain migration       | Verification is BLOCKED         |
| `STAGING_ALLOWED_HOSTS`           | Allow stateful staging targets    | Hosted staging verification    | `staging`               | Yes      | Comma-separated exact hostnames | Review with preview/staging domains | Hosted run is BLOCKED           |
| `STAGING_SUPABASE_URL`            | Bind staging data plane           | Hosted staging verification    | `staging`               | Yes      | Exact staging HTTPS endpoint    | Update after project migration      | Hosted run is BLOCKED           |
| `STAGING_SUPABASE_PROJECT_REF`    | Staging identity/operation target | Hosted/protected operations    | `staging`, `production` | Yes      | Exact 20-character project ref  | Requires environment review         | Hosted/operation run is BLOCKED |
| `PRODUCTION_SUPABASE_PROJECT_REF` | Production deny/operation target  | Hosted/protected operations    | `staging`, `production` | Yes      | Exact production project ref    | Requires production approval        | Guard/operation is BLOCKED      |

Use environment protection, required reviewers, least privilege, access logs,
and scheduled rotation. Never echo these values, upload environment files, use
them in PR events, or pass production values to staging. Missing configuration
is a hard BLOCKED result, never a skipped success.
