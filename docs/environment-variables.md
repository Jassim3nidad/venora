# Environment Variables

`.env.example` is the safe cross-service inventory. The Next.js app reads
`apps/web/.env.local`; Edge Functions use local Supabase env files or hosted
Supabase secrets. Vercel, CI, and Supabase dashboards are separate scopes. Values
below are names and placeholders only.

## Rules

- Only `NEXT_PUBLIC_*` values may reach browser bundles. A Supabase service-role
  or secret key must never use that prefix.
- `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` and
  `NEXT_PUBLIC_SUPABASE_SECRET_KEY` are forbidden exposure patterns checked by
  validation; neither must be configured.
- Local/test credentials must belong to dedicated fixtures. Do not reuse
  production users or data.
- Rotate server secrets at the provider, update every authorized scope, and
  redeploy/retest dependents. Public URL/key rotation can require a rebuild.
- “Required” means required for the named capability, not for every page.

## Application and Supabase

| Variable                        | Class / requirement                                            | Scope and exposure                                       | Placeholder / absence / rotation                                                                               |
| ------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`           | PUBLIC, BUILD-TIME; required for canonical URLs                | local/preview/prod; browser-visible                      | `http://localhost:3000`; wrong/missing causes wrong canonical, callback, and return URLs; rebuild after change |
| `NEXT_PUBLIC_SITE_URL`          | PUBLIC, OPTIONAL compatibility fallback                        | local/preview/prod; browser-visible                      | Same origin format; missing is safe when app URL is set; rebuild after change                                  |
| `APP_URL`                       | SERVER-ONLY, RUNTIME; required by some Edge flows              | local/preview/prod/Edge                                  | Origin URL; wrong/missing breaks links and notifications; redeploy Edge functions                              |
| `APP_BASE_URL`                  | TEST-ONLY, RUNTIME; optional Playwright target                 | local/test                                               | Origin URL; defaults to local app; no secret rotation                                                          |
| `NEXT_PUBLIC_SUPABASE_URL`      | PUBLIC, BUILD-TIME; required                                   | local/preview/prod; browser-visible                      | `https://example-project.supabase.co`; missing blocks clients; rebuild after change                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | PUBLIC, BUILD-TIME; required                                   | local/preview/prod; browser-visible publishable/anon key | Placeholder publishable key; missing blocks clients; rotate/rebuild with project policy                        |
| `SUPABASE_URL`                  | SERVER-ONLY/EDGE-FUNCTION SECRET, RUNTIME                      | scripts and Edge Functions                               | Project URL; missing breaks server utilities/functions; redeploy after change                                  |
| `SUPABASE_ANON_KEY`             | SERVER-ONLY/EDGE-FUNCTION SECRET, RUNTIME                      | scripts and Edge Functions                               | Publishable/anon key; missing breaks anon checks; redeploy after change                                        |
| `SUPABASE_SERVICE_ROLE_KEY`     | SERVER-ONLY/EDGE-FUNCTION SECRET, RUNTIME; capability-required | web server, scripts, Edge; never browser                 | `<supabase-service-role-key>`; missing breaks privileged webhook/refund/tests; revoke immediately if exposed   |

## Integrations and AI

| Variable                  | Class / requirement                                                           | Scope and exposure                              | Placeholder / absence / rotation                                                                          |
| ------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `PAYMONGO_SECRET_KEY`     | SERVER-ONLY, RUNTIME; required for checkout/refund                            | web server preview/prod/test                    | `<paymongo-test-secret-key>`; missing causes gateway failure; rotate with checkout validation             |
| `PAYMONGO_WEBHOOK_SECRET` | SERVER-ONLY, RUNTIME; required for PayMongo webhook                           | webhook environment                             | `<paymongo-test-webhook-secret>`; mismatch rejects signatures; coordinate endpoint rotation               |
| `STRIPE_SECRET_KEY`       | DEPRECATED/CONFIGURATION ONLY                                                 | comments/examples, no registered gateway        | Do not set expecting working checkout                                                                     |
| `STRIPE_WEBHOOK_SECRET`   | DEPRECATED/CONFIGURATION ONLY                                                 | old examples only                               | Do not set expecting working webhooks                                                                     |
| `RESEND_API_KEY`          | SERVER-ONLY/EDGE-FUNCTION SECRET, RUNTIME                                     | web/Edge/test; never browser                    | `<resend-test-api-key>`; missing email delivery fails; rotate and send test mail                          |
| `RESEND_FROM`             | SERVER-ONLY/EDGE-FUNCTION SECRET, RUNTIME                                     | web/Edge/test                                   | `Venora <notifications@example.test>`; invalid sender is rejected; no credential rotation                 |
| `RSVP_REMINDER_SECRET`    | EDGE-FUNCTION/CI SECRET, RUNTIME; required for scheduled RSVP reminders       | Supabase Edge and GitHub production environment | Random shared secret; mismatch rejects reminder batches; rotate both scopes together                      |
| `VAPID_PUBLIC_KEY`        | SERVER-ONLY RUNTIME value shared with subscribers                             | web/Edge; not a private credential              | `<vapid-public-key>`; missing prevents subscription/delivery; key-pair rotation invalidates subscriptions |
| `VAPID_PRIVATE_KEY`       | SERVER-ONLY/EDGE-FUNCTION SECRET, RUNTIME                                     | web/Edge only                                   | `<vapid-private-key>`; missing delivery fails; rotate pair and resubscribe                                |
| `VAPID_SUBJECT`           | SERVER-ONLY/EDGE-FUNCTION SECRET, RUNTIME                                     | web/Edge                                        | `mailto:operations@example.test`; invalid subject fails provider validation                               |
| `OPENROUTER_API_KEY`      | EDGE-FUNCTION SECRET, RUNTIME; required for current generation/assistant path | Supabase Edge local/preview/prod                | `<openrouter-api-key>`; missing triggers feature fallback/error; rotate and smoke-test AI                 |

There is no Google Maps key, alternate AI-provider key, or external analytics
key in the implementation. Maps use MapLibre/OpenFreeMap and OSM Nominatim;
analytics are database-derived. The database constrains every active AI feature
to OpenRouter with `tencent/hy3:free`.

## Test-only variables

| Variable group                                                                       | Purpose                                            | Scope / risk                                           | Missing symptom                              |
| ------------------------------------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------- |
| `NOTIFICATION_TEST_EMAIL`, `NOTIFICATION_TEST_PASSWORD`, `NOTIFICATION_TEST_USER_ID` | Notification provider/database/pipeline validators | TEST-ONLY; dedicated account/data, never commit values | Targeted notification validation exits early |
| `E2E_CUSTOMER_EMAIL`, `E2E_CUSTOMER_PASSWORD`                                        | Customer Playwright fixture                        | TEST-ONLY                                              | Customer authenticated specs skip/fail       |
| `E2E_VENUE_EMAIL`, `E2E_VENUE_PASSWORD`                                              | Venue-owner fixture                                | TEST-ONLY                                              | Venue-owner specs skip/fail                  |
| `E2E_COORDINATOR_EMAIL`, `E2E_COORDINATOR_PASSWORD`                                  | Coordinator fixture                                | TEST-ONLY                                              | Coordinator specs skip/fail                  |
| `E2E_SUPPLIER_EMAIL`, `E2E_SUPPLIER_PASSWORD`                                        | Supplier fixture                                   | TEST-ONLY                                              | Supplier specs skip/fail                     |
| `E2E_SUPERADMIN_EMAIL`, `E2E_SUPERADMIN_PASSWORD`                                    | Super-admin fixture                                | TEST-ONLY/high privilege                               | Super-admin specs skip/fail                  |
| `E2E_ANALYST_ADMIN_EMAIL`, `E2E_ANALYST_ADMIN_PASSWORD`                              | Analyst-admin fixture                              | TEST-ONLY/high privilege                               | Analytics permission specs skip/fail         |
| `E2E_FINANCE_ADMIN_EMAIL`, `E2E_FINANCE_ADMIN_PASSWORD`                              | Finance-admin fixture                              | TEST-ONLY/high privilege                               | Finance permission specs skip/fail           |

`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER` are
DEPRECATED/UNSUPPORTED configuration checks: SMS remains disabled even if set.

## Platform-provided variables

| Variable                                                              | Classification                   | Notes                                                             |
| --------------------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------- |
| `NODE_ENV`                                                            | RUNTIME/BUILD-TIME               | Set by Node/Next; do not hard-code in env examples                |
| `CI`                                                                  | BUILD-TIME                       | Set by CI runners; changes test/build behavior                    |
| `ANALYZE`                                                             | BUILD-TIME, OPTIONAL             | Set by the bundle-analysis script                                 |
| `VERCEL_ENV`, `VERCEL_URL`, `VERCEL_PROJECT_PRODUCTION_URL`           | BUILD/RUNTIME, platform-provided | Server-side Vercel metadata; dashboard behavior not repo-verified |
| `NEXT_PUBLIC_VERCEL_URL`, `NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL` | PUBLIC, platform-provided        | Browser-visible Vercel host fallbacks; rebuild-scoped             |

`SUPABASE_ACCESS_TOKEN` is an operational CLI credential, not an app variable.
Keep it outside repository env templates unless a controlled deployment system
requires it.

## Existing validation matrix

| Validator                            | Variables checked                                                                               | External effect               |
| ------------------------------------ | ----------------------------------------------------------------------------------------------- | ----------------------------- |
| `node scripts/validate-env.mjs`      | Supabase public/server keys, Resend, VAPID; forbids public service/secret keys; warns on Twilio | Reads local env only          |
| `node scripts/validate-resend.mjs`   | Resend key/from and notification test email                                                     | Sends a test email            |
| `node scripts/validate-db.mjs`       | Supabase URL/service/anon configuration                                                         | Queries configured database   |
| `node scripts/validate-pipeline.mjs` | Supabase public URL, service key, notification test user                                        | Writes test notification data |
| `pnpm docs:technical:validate`       | Variable names documented; secret/local-path patterns                                           | Repository files only         |

Provider validators are not part of the default unit suite because they need
credentials and can create external effects. See [Testing](testing.md) and
[Notifications](notifications.md).
