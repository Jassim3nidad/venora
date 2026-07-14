# Security Test Plan and Findings

## Automated scope

```bash
pnpm test:security
pnpm test:database
pnpm test:secrets
```

Coverage aligns to OWASP broken access control, injection, security
misconfiguration, identification/auth failures, integrity, logging, SSRF-style
URL misuse, unsafe upload, replay/idempotency, and secret exposure risks.

## Findings

| Severity | Category              | Route/component           | Evidence                                                                        | Impact                                                                | Status/test                                     | Remaining risk                                     |
| -------- | --------------------- | ------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------- |
| P0       | Broken access control | `venue-images` Storage    | Migration 051 allowed role-only writes                                          | Venue actor could target another venue path                           | Fixed statically in migration 071; DB validator | Migration not applied/runtime-tested               |
| P1       | Debug exposure        | `/api/debug`              | Unauthenticated handler attempted `auth.admin.listUsers()` and returned details | User IDs/inquiry/internal error exposure if privileged client reached | Disabled with empty 404; regression test        | Deployment verification pending                    |
| P1       | MIME spoofing         | Verification documents    | Metadata/extension checked; bytes not inspected                                 | Disguised content presented to reviewers                              | Magic-byte check + seven tests                  | Header-only checks do not defeat polyglots/malware |
| P2       | Abuse protection      | Sensitive Next.js APIs/AI | No central rate limiter found                                                   | Brute force, cost, export/webhook abuse                               | Open; route-local AI limits partially tested    | Platform design needed                             |
| P2       | Data provenance       | Supplier marketplace      | Empty/error DB falls back to sample inventory                                   | Sample can resemble live inventory                                    | Confirmed; documented, not changed              | UI disclosure/source typing needed                 |
| P2       | API consistency       | HTTP operations           | Mixed response envelopes                                                        | Client/error handling inconsistency                                   | Documented                                      | Contract migration needed                          |
| P2       | Payment completeness  | Maya webhook              | Signature code exists; reconciliation partial                                   | External paid state may not settle workflow                           | Documented, not claimed operational             | Implement/test reconciliation                      |

## Existing protections verified by tests/static evidence

- PayMongo signatures, missing/malformed signatures, replay/idempotency, late and
  duplicate events.
- CSV formula-injection prevention and PDF header output.
- RBAC tier permission evaluation and admin action denial.
- Booking/calendar other-owner rejection in mocked actions.
- Internal payment/notification function grants revoked from public callers.
- Secret/public-key guard prevents service-role key use in RLS client.

## Required runtime security work

Use two customers, two venue organizations, two suppliers, coordinator, and
permission-limited admins in disposable QA. Prove IDOR denial, private exports,
Storage overwrite/delete denial, signed URL expiry, Edge JWT enforcement, live
grants, CSRF assumptions, open redirects, XSS payload rendering, and audit
records. Do not run destructive security tests in production.
