# Venora Authentication and Authorization Security Report

## 1. Executive Summary

Initial risk was High because direct Supabase Auth signup could trust `raw_user_meta_data.role` for partner roles. The web registration UI already creates customer accounts only, but a malicious client can call Supabase Auth directly with the public anon key. This report documents the audit and hardening completed in this pass.

Release recommendation: Ready after manual configuration.

Highest-risk fixed findings:

- AUTH-001: Public direct signup could create trusted partner roles.
- AUTH-002: Auth redirect validation did not reject encoded protocol-relative variants and had an unsafe OAuth callback fallback.
- AUTH-003: Reset-password form accepted any active session, not only a recovery context.

Testing limitations:

- No destructive production testing was performed.
- Supabase Dashboard settings cannot be verified from this repository.
- RLS behavior was reviewed from migrations and code, but not executed against live role-specific staging accounts in this pass.

## 2. Scope

Files reviewed:

- `apps/web/src/features/auth/**`
- `apps/web/app/(auth)/**`
- `apps/web/app/auth/callback/route.ts`
- `apps/web/app/logout/route.ts`
- `apps/web/src/lib/supabase/**`
- `apps/web/src/lib/rbac/**`
- `apps/web/src/lib/security/rate-limit.ts`
- `apps/web/proxy.ts`
- `apps/web/app/(admin)/**/layout.tsx`
- `apps/web/app/(supplier)/**/layout.tsx`
- `apps/web/app/(venue-owner)/**/layout.tsx`
- `apps/web/app/(event-coordinator)/**/layout.tsx`
- `apps/web/src/features/partner-applications/**`
- `apps/web/src/features/booking/**`
- `apps/web/src/features/suppliers/**`
- `supabase/migrations/**`

Roles reviewed: customer, venue_owner, supplier, event_coordinator, admin.

## 3. Threat Model

Assets:

- User accounts, Supabase sessions, roles, profiles, bookings, inquiries, supplier proposals, payment records, verification documents, admin audit logs, service-role secrets.

Actors:

- Anonymous visitor, authenticated customer, partner applicant, venue owner, supplier, event coordinator, admin, compromised account, automated abuse client.

Entry points:

- Registration, login, OAuth callback, email confirmation, resend confirmation, forgot password, reset password, logout, partner application, admin approval, protected dashboards, server actions, route handlers, Supabase Data API, storage policies, webhooks.

Trust boundaries:

- Browser to Server Actions, browser to Supabase Auth, server to Supabase RLS client, server-only service-role client, Edge Functions, Supabase Dashboard configuration.

Main abuse cases:

- Role escalation through signup metadata, IDOR against bookings/inquiries, unsafe redirects after auth, account enumeration, reset-password misuse, stale sessions after suspension, service-role key exposure, unsafe RLS policies, weak external dashboard settings.

## 4. Findings

### AUTH-001 - Direct signup grants partner role

- Severity: Critical
- Status: Fixed
- Category: Privilege escalation
- Location: `supabase/migrations/022_single_role_accounts.sql`, `supabase/migrations/072_harden_public_auth_role_assignment.sql`
- Description: `public_signup_role(raw_role)` allowed `venue_owner`, `supplier`, and `event_coordinator` from `raw_user_meta_data.role`.
- Attack scenario: A malicious client calls Supabase Auth signup directly with anon key and `data.role = "supplier"` to access partner routes without admin approval.
- Impact: Unauthorized partner dashboard access and creation of partner-owned records.
- Evidence: Migration 022 accepted non-admin role metadata.
- Fix: Migration 072 makes public signup always return `customer`.
- Validation: Unit/type/build validation required after this report.
- Remaining risk: Existing users created before migration should be reviewed for unexpected partner roles.

### AUTH-002 - Redirect validation gaps

- Severity: High
- Status: Fixed
- Category: Open redirect
- Location: `apps/web/src/lib/profile-setup.ts`, `apps/web/app/auth/callback/route.ts`
- Description: Redirect validation did not reject encoded protocol-relative variants, and the callback had a fallback redirect using raw `next`.
- Attack scenario: Attacker supplies a crafted `next` value to auth callback or login.
- Impact: Post-auth redirect to an attacker-controlled destination.
- Evidence: `new URL(next, request.url)` fallback existed.
- Fix: Strengthened `isSafeInternalRedirect`, added tests, removed raw fallback.
- Validation: `profile-setup.test.ts` covers external, protocol-relative, encoded, and auth-loop destinations.
- Remaining risk: Production redirect allowlist still needs Supabase Dashboard verification.

### AUTH-003 - Reset form accepted non-recovery sessions

- Severity: High
- Status: Fixed
- Category: Account takeover defense
- Location: `apps/web/app/auth/callback/route.ts`, `apps/web/src/features/auth/actions/auth.actions.ts`
- Description: Reset page checked for any client session, and server action updated password without requiring recovery context.
- Attack scenario: A signed-in user opens `/reset-password` and changes password without current password verification.
- Impact: Weakens recent-auth/current-password protection.
- Fix: Auth callback sets a short-lived HTTP-only recovery cookie only for `/reset-password`; reset action requires and clears it.
- Remaining risk: Staging should verify expired/reused Supabase recovery links.

### AUTH-004 - Login and registration exposed unnecessary auth state

- Severity: Medium
- Status: Fixed
- Category: Account enumeration
- Location: `apps/web/src/features/auth/actions/auth.actions.ts`
- Description: Login returned raw Supabase errors for most failures, and registration returned duplicate-email messaging.
- Fix: Login now returns `Invalid email or password.` for ordinary failures; registration duplicate is generic.
- Remaining risk: Email-unverified UX still intentionally shows resend guidance after valid credentials.

### AUTH-005 - Password policy below preferred baseline

- Severity: Medium
- Status: Fixed
- Category: Password policy
- Location: `apps/web/src/features/auth/schemas/auth.schema.ts`
- Fix: Minimum password length raised from 8 to 12 and max length capped at 128.
- Remaining risk: Supabase Dashboard password policy must be aligned manually.

### AUTH-006 - Logout route logged auth-related environment/cookie names

- Severity: Low
- Status: Fixed
- Category: Information leakage
- Location: `apps/web/app/logout/route.ts`
- Fix: Removed debug logging of Supabase URL and auth cookie names.

### AUTH-007 - Profiles table has broad public SELECT

- Severity: Medium
- Status: Open
- Category: RLS privacy
- Location: `supabase/migrations/010_rls.sql`
- Description: `profiles.select.public` permits selecting profile rows broadly.
- Impact: Public exposure of profile fields such as full name, avatar, phone, and status depending on API grants.
- Recommendation: Replace with self/admin access plus a public-safe profile view or explicit profile fields embedded in public listing queries.

### AUTH-008 - Service-role usage review

- Severity: Low
- Status: Reviewed
- Category: Secret protection
- Location: `apps/web/src/lib/supabase/admin.ts`, `apps/web/src/lib/supabase/service.ts`, webhook routes, Supabase Edge Functions
- Description: Service-role key references are server-only route handlers, server-only helper modules, Edge Functions, scripts, migrations, or documentation.
- Evidence: Safe name-based search found no `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` usage in application source.
- Fix: No code change required in this pass.
- Remaining risk: Runtime environment values must still be managed through Vercel/Supabase secret storage and rotated if ever exposed.

## 5. Code Changes

- Added migration 072 to force all public signups to customer.
- Strengthened internal redirect validation.
- Added redirect safety unit tests.
- Made login/registration error messages more generic.
- Added reset-password recovery cookie requirement.
- Raised password minimum to 12 characters.
- Removed logout debug logs.
- Added conservative security headers with CSP Report-Only.
- Added this report and Supabase production checklist.

## 6. RLS Review

| Table                           | RLS status | Customer access         | Partner access            | Admin access                   | Public access       | Finding                                | Change                 |
| ------------------------------- | ---------- | ----------------------- | ------------------------- | ------------------------------ | ------------------- | -------------------------------------- | ---------------------- |
| profiles                        | Enabled    | Self update             | Reads via broad policy    | All                            | Broad SELECT        | Public profile data too broad          | Recommended follow-up  |
| user_roles                      | Enabled    | Self select             | Self select               | All                            | None                | Signup trigger trusted role metadata   | Fixed by migration 072 |
| organizations                   | Enabled    | None                    | Venue owner/member scoped | All                            | None                | Owner policies present                 | None                   |
| organization_members            | Enabled    | Self/member scoped      | Org owner scoped          | All                            | None                | Owner policies present                 | None                   |
| venues                          | Enabled    | Public published read   | Org member manage         | All                            | Published only      | OK from migration review               | None                   |
| venue_images/packages/amenities | Enabled    | Public listing read     | Venue scoped write        | All                            | Public listing read | Broad public listing intended          | None                   |
| venue_availability              | Enabled    | Public read             | Venue scoped write        | All                            | Public read         | Required for booking calendar          | None                   |
| bookings                        | Enabled    | Own records             | Venue-owner venue scoped  | All                            | None                | Later migration tightens insert/update | None                   |
| booking_status_history          | Enabled    | Own booking             | Venue booking scoped      | All                            | None                | OK from migration review               | None                   |
| favorites                       | Enabled    | Own records             | None                      | Via admin policy where present | None                | OK                                     | None                   |
| supplier_profiles               | Enabled    | Public accredited read  | Self write                | All                            | Accredited only     | OK from migration review               | None                   |
| supplier_services               | Enabled    | Public read             | Supplier scoped write     | All                            | Public read         | Public service listing intended        | None                   |
| supplier_quotes                 | Enabled    | Participant             | Supplier participant      | All                            | None                | OK from migration review               | None                   |
| supplier_quote_items            | Enabled    | Participant             | Supplier participant      | All                            | None                | OK from migration review               | None                   |
| supplier_inquiry_messages       | Enabled    | Participant             | Supplier participant      | All                            | None                | OK from migration review               | None                   |
| supplier_availability           | Enabled    | Public read             | Supplier scoped write     | All                            | Public read         | Required for supplier discovery        | None                   |
| reviews                         | Enabled    | Own/create              | Owner reply               | All                            | Published only      | OK from migration review               | None                   |
| supplier_reviews                | Enabled    | Own/create              | None                      | All                            | Published only      | OK from migration review               | None                   |
| notifications                   | Enabled    | Own records             | Own records               | All                            | None                | OK                                     | None                   |
| audit_logs                      | Enabled    | None                    | None                      | Permission-gated               | None                | OK after migration 054/065             | None                   |
| transactions/payouts            | Enabled    | Booking/customer scoped | Org/supplier scoped       | All                            | None                | OK from migration review               | None                   |
| verification_requests           | Enabled    | Own records             | Own records               | All                            | None                | OK                                     | None                   |
| admin_* tables                  | Enabled    | None                    | None                      | Permission-gated               | None                | OK from migration review               | None                   |

## 7. Supabase Manual Configuration

See `docs/security/supabase-auth-production-checklist.md`.

## 8. Test Results

To be filled by validation commands after implementation:

- Unit tests: passed (`pnpm --filter @venora/web test -- src/lib/profile-setup.test.ts`)
- Type-check: passed (`pnpm --filter @venora/web type-check`)
- Build: passed (`pnpm --filter @venora/web build`)
- Conflict marker scan: passed (`git grep -n -E "^(<<<<<<<|=======|>>>>>>>)"` returned no matches)
- Diff check: passed (`git diff --check`)
- Package files: unchanged (`package.json`, `pnpm-lock.yaml`, and `apps/web/package.json`)
- Safe secret-name search: completed; no secret values printed. Service-role references are server-only helpers, route handlers, Edge Functions, migrations, scripts, or docs.
- Browser tests: not run. Auth flow testing needs safe test credentials and non-production/staging data.

## 9. Remaining Risks

- Existing database users should be audited for partner roles created before migration 072.
- Supabase Dashboard settings must be verified manually.
- MFA and CAPTCHA are not active from repository code in this pass.
- RLS was reviewed from migrations; live staging role tests are still required.
- `profiles.select.public` should be narrowed in a follow-up with a public-safe view.
- GET `/logout` remains a state-changing endpoint for compatibility; POST logout is recommended for a stricter CSRF posture.

## 10. Release Recommendation

Ready after manual configuration.
