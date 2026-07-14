# Security Policy

## Supported version

Security fixes target the current `main` branch. No separately supported release
branches or response-time service-level agreement are documented.

## Reporting a vulnerability

Do not publish a suspected vulnerability, credential, personal data, payment
record, or exploit in a public issue. Use the repository owner's private
reporting channel or Git hosting provider's private vulnerability-reporting
feature when enabled. If no private channel is visible, contact a maintainer
through an existing non-sensitive project channel and ask for a secure route.

Include affected commit/environment, impact, minimal reproduction, relevant
request IDs or redacted logs, and suggested containment. Do not include live
secrets or unnecessary personal data. Allow maintainers to reproduce, contain,
fix, validate, and coordinate disclosure without promising a fixed timeline.

## Priority areas

- Authentication, session, callback, password-reset, and account-approval flaws
- Role, admin-permission, RLS, Storage-policy, or cross-account exposure flaws
- PayMongo signature, reconciliation, refund, invoice, or receipt flaws
- Secret exposure, unsafe browser variables, or service-role misuse
- Personal-data, verification-document, notification, or analytics-export leaks
- AI prompt injection or unintended sensitive-data disclosure

Client-side checks and hidden UI are not security controls. Server-side checks,
RLS, scoped Storage policies, webhook verification, reconciliation, and
idempotency must remain enforced.

## Exposed secret

Contain access, preserve evidence, revoke/rotate the credential at its provider,
update each authorized environment, redeploy if necessary, and validate audit
logs and dependent integrations. Do not commit the replacement. Follow the
[secret rotation runbook](docs/runbooks/27-secret-exposure-rotation.md).

Responsible testing must avoid denial of service, destructive production
changes, social engineering, unauthorized data access, and disclosure before a
fix is available.
