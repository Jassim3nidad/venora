# Authentication

Venora uses Supabase Auth with SSR cookie handling. Authentication proves an
identity; it does not by itself grant an application role, approval, admin
permission, row access, or Storage access.

## Lifecycle

| Flow                | Implemented path                                              | Success                                             | Common failure                                                  |
| ------------------- | ------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------- |
| Registration        | Registration UI calls Supabase sign-up and profile/role setup | Session or verification-required state              | Existing identity, weak password, email provider/config error   |
| Email verification  | Supabase email link returns through `/auth/callback`          | Code exchange and role-aware redirect               | Expired token, callback not allow-listed, wrong site URL        |
| Resend verification | Verification UI requests another Supabase email               | Non-enumerating confirmation                        | Provider throttle or invalid redirect config                    |
| Login               | Email/password Supabase sign-in                               | Cookie-backed session and dashboard/return redirect | Invalid credentials, unverified email, inactive/pending account |
| Logout              | Server/client sign-out path                                   | Session cleared and public redirect                 | Stale cookie or network error                                   |
| Forgot password     | Recovery request supplies reset redirect                      | Generic confirmation                                | Email/provider or redirect failure                              |
| Reset password      | Recovery session updates password                             | Login redirect                                      | Expired/missing recovery session                                |

Existing-account handling must not reveal whether an email belongs to a user.
Registration, recovery, and resend screens should use generic responses where
Supabase permits.

`/auth/callback` exchanges the code with Supabase. Its origin and permitted
redirect must match the current local, preview, or production environment.
Never allow arbitrary user-controlled external return URLs.

## Sessions and protected routes

`apps/web/proxy.ts` refreshes SSR sessions and performs coarse route-group
guards. Server Components use server Supabase clients to resolve users. Client
auth state is useful for rendering but cannot authorize access. Every Server
Action and Route Handler must resolve the user and enforce role/permission;
database operations remain subject to RLS unless deliberately privileged.

Role-aware redirects separate customer, venue-owner, supplier,
event-coordinator, and admin dashboards. Partner roles can also depend on
application approval/status. A valid login with a pending, rejected, disabled,
or missing profile must not be treated as approved access.

## Failure handling

- Callback loop: verify `NEXT_PUBLIC_APP_URL`, Supabase site URL, redirect
  allow-list, proxy cookies, and deployed domain.
- Session missing after callback: inspect code exchange response and cookie
  domain/secure settings without logging tokens.
- Wrong dashboard: inspect profile, `user_roles`, partner application status,
  and admin role assignment.
- Browser appears authorized but mutation fails: server guard or RLS rejected
  it; do not bypass either layer.

See [Authorization](authorization.md), [environment variables](environment-variables.md),
and the auth runbooks under [Operational runbooks](runbooks/README.md).
