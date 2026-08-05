# Operational Runbooks

These procedures favor containment, evidence, least privilege, and reversible
changes. Confirm environment/project/commit before every dashboard or CLI step.
Never paste secrets into tickets or logs, reset production, rewrite migration
history, or manually change payment/booking state without approved reconciliation.

| #   | Runbook                                                                    | Status  |
| --- | -------------------------------------------------------------------------- | ------- |
| 01  | [Failed Vercel deployment](01-failed-vercel-deployment.md)                 | CURRENT |
| 02  | [Unexpected production commit](02-unexpected-production-commit.md)         | CURRENT |
| 03  | [Supabase migration failure](03-supabase-migration-failure.md)             | CURRENT |
| 04  | [Migration applied but types stale](04-stale-database-types.md)            | CURRENT |
| 05  | [Missing RLS policy](05-missing-rls-policy.md)                             | CURRENT |
| 06  | [Unexpected RLS denial](06-unexpected-rls-denial.md)                       | CURRENT |
| 07  | [Cross-account exposure suspicion](07-cross-account-exposure-suspicion.md) | CURRENT |
| 08  | [PayMongo checkout failure](08-paymongo-checkout-failure.md)               | CURRENT |
| 09  | [Incorrect PayMongo return URL](09-paymongo-return-url.md)                 | CURRENT |
| 10  | [PayMongo webhook signature failure](10-paymongo-webhook-signature.md)     | CURRENT |
| 11  | [Duplicate PayMongo webhook](11-duplicate-paymongo-webhook.md)             | CURRENT |
| 12  | [Late or out-of-order PayMongo webhook](12-late-paymongo-webhook.md)       | CURRENT |
| 13  | [Paid but booking not confirmed](13-paid-booking-pending.md)               | CURRENT |
| 14  | [Receipt or invoice missing](14-missing-payment-documents.md)              | CURRENT |
| 15  | [Refund mismatch](15-refund-mismatch.md)                                   | CURRENT |
| 16  | [SMTP delivery failure](16-smtp-delivery-failure.md)                       | CURRENT |
| 17  | [Web Push delivery failure](17-web-push-delivery-failure.md)               | CURRENT |
| 18  | [Storage upload denial](18-storage-upload-denial.md)                       | CURRENT |
| 19  | [Verification-document access](19-verification-document-access.md)         | CURRENT |
| 20  | [Authentication callback failure](20-auth-callback-failure.md)             | CURRENT |
| 21  | [Email-verification failure](21-email-verification-failure.md)             | CURRENT |
| 22  | [Password-reset failure](22-password-reset-failure.md)                     | CURRENT |
| 23  | [Analytics export failure](23-analytics-export-failure.md)                 | CURRENT |
| 24  | [OpenAPI validation failure](24-openapi-validation-failure.md)             | CURRENT |
| 25  | [Test-suite failure](25-test-suite-failure.md)                             | CURRENT |
| 26  | [Production-build failure](26-production-build-failure.md)                 | CURRENT |
| 27  | [Secret exposure or rotation](27-secret-exposure-rotation.md)              | CURRENT |
| 28  | [Production incident triage](28-production-incident-triage.md)             | CURRENT |
| 29  | [Rollback procedure](29-rollback-procedure.md)                             | CURRENT |
| 30  | [Emergency access review](30-emergency-access-review.md)                   | CURRENT |

Commands are run from the repository root unless a runbook says otherwise.
Dashboard/API steps require separately authorized access. Preserve timestamps,
request/event IDs, source commit, redacted logs, decisions, and validation.
