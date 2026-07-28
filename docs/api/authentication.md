# Authentication and Authorization

## Mechanisms

Next.js Route Handlers and Server Actions call `supabase.auth.getUser()` through the server client. The browser session is stored in Supabase auth cookies managed by `@supabase/ssr`. OpenAPI's `supabaseSession` represents this cookie-based mechanism.

Supabase Edge Functions receive `Authorization: Bearer <access-token>` plus the public `apikey` header used by Supabase clients. A service-role token is server-only and is used only for trusted webhook/queue/database work.

Authorization layers:

1. session or verified Edge bearer token;
2. application role/permission/ownership guard;
3. PostgreSQL function checks;
4. table/storage RLS.

Supported application roles are `customer`, `venue_owner`, `event_coordinator`, `supplier`, and `admin`. Public registration cannot create admins. Admin operations use permission keys such as `reports.export`, `admin_roles.manage`, `commissions.manage`, `marketplace.moderate`, `system_settings.manage`, and `ai_config.manage`.

## HTTP authentication endpoints

### `GET /auth/callback`

Purpose: finish Supabase OAuth/PKCE authentication or hand email verification tokens to `/confirm`.

Query parameters:

- `code`: one-time PKCE/OAuth code. Exchanged through `exchangeCodeForSession`.
- `token_hash` and `type`: redirected to `/confirm` so email scanners do not consume the token.
- `next`: post-auth destination, passed through `resolvePostAuthRedirect` when user/profile is available.
- `error`: provider-side error; mapped to `oauth_cancelled` or `oauth_provider_error`.

Success: redirect to resolved profile/role destination. Failure: redirect to `/login?error=<stable-code>`. Restricted account messages map to `account_restricted`; other exchange details are hidden.

Security: one-time values must not be logged. `next` is processed by application redirect logic when a user is available; keep redirect sanitization covered by tests.

### `GET /logout`

Calls Supabase `signOut`, removes `sb-*`/`auth-token` cookies, and redirects to `/`. Repeat calls are harmless. Current implementation logs Supabase URL and cookie names; these are not secret values, but production logging should remain minimal.

## Auth Server Actions

| Action                          | Input and validation                                                                   | Auth                                          | Side effects and response                                                    |
| ------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------- |
| `registerAction`                | Full name 2-120; normalized email; password >=8 with letter+number; confirmation match | Public                                        | Supabase sign-up, verification email. `{success,data?,error?,fieldErrors?}`  |
| `loginAction`                   | Email; non-empty password; optional redirect                                           | Public                                        | Password sign-in, reads role/profile, redirects through profile setup policy |
| `resendVerificationEmailAction` | Valid normalized email                                                                 | Public                                        | Supabase resend; generic result avoids account enumeration details           |
| `signOutAction`                 | None                                                                                   | Session optional                              | Supabase sign-out                                                            |
| `forgotPasswordAction`          | Valid email                                                                            | Public                                        | Sends reset email with application callback                                  |
| `resetPasswordAction`           | Strong password and matching confirmation                                              | Recovery session                              | Updates Supabase password                                                    |
| `verifyOtpAction`               | Token hash; type `signup\|email`                                                       | Public one-time token                         | Verifies OTP and establishes session when valid                              |
| `updateProfileAction`           | Name 2-120; optional Philippine mobile syntax                                          | Session                                       | Updates own `profiles` row; revalidates account layout                       |
| `updateAvatarAction`            | Public avatar URL plus storage path                                                    | Session; path must belong to user             | Updates profile; removes previous `avatars` object                           |
| `removeAvatarAction`            | None                                                                                   | Session                                       | Clears profile avatar and deletes previous owned object                      |
| `changePasswordAction`          | Current password; strong new password; match                                           | Session and current-password reauthentication | Updates Supabase password                                                    |
| `deleteAccountAction`           | Password twice plus exact `DELETE MY ACCOUNT` phrase                                   | Session and password reauthentication         | Calls configured account-deletion workflow; irreversible                     |
| `completeProfileSetupAction`    | Name/phone plus notification and event-type preferences                                | Session                                       | Updates own profile/preferences and completion timestamp                     |
| `skipProfileSetupAction`        | None                                                                                   | Session                                       | Marks setup complete with existing profile data                              |

Server Action examples are TypeScript calls, not public HTTP requests:

```ts
const result = await loginAction({
  email: "customer@example.test",
  password: "Example123",
});
```

## Role/permission matrix for HTTP routes

| Surface                                     |    Public | Any session | Role/permission                                                   |
| ------------------------------------------- | --------: | ----------: | ----------------------------------------------------------------- |
| Supplier list/detail                        |       Yes |         Yes | None                                                              |
| Push public key                             |       Yes |         Yes | None                                                              |
| Booking list/create                         |        No |         Yes | Customer ownership and RLS govern records                         |
| Booking approve/decline                     |        No |          No | Venue organization member/owner or admin                          |
| Booking cancel/complete                     |        No |         Yes | Workflow RPC checks customer/org/admin and valid state            |
| Payment start                               |        No |         Yes | Booking customer through RPC                                      |
| Refund                                      |        No |         Yes | Customer, venue organization member, or admin through RPC         |
| Notifications/preferences/push subscription |        No |         Yes | Own rows only                                                     |
| Venue create                                |        No |          No | Venue owner, coordinator, or admin; organization access in RPC    |
| Venue analytics export                      |        No |          No | Venue owner, coordinator, or admin, scoped to owned/member venues |
| Admin report export                         |        No |          No | `reports.export`                                                  |
| PayMongo webhooks                           | Signature |          No | Provider signature, service-role processing                       |

## RLS assumptions

- A successful application guard does not bypass RLS when using a user-scoped client.
- Service-role clients bypass RLS and therefore appear only in payment webhooks, checkout attachment, refund reconciliation, AI server work, and notification delivery.
- Every service-role Edge Function must perform its own authorization before reading user-private data or writing on a user's behalf.
- `ai-venue-description` explicitly checks organization membership/admin because it uses service role.
- `ai-assistant` verifies an optional bearer before adding that user's bookings to model context.

## CSRF and origin

Route Handlers use same-site session cookies but no custom CSRF token middleware was found. Mutating JSON endpoints should be called same-origin and keep restrictive cookie settings. Server Actions rely on Next.js Server Action origin checks and opaque action identifiers; they are not stable public REST endpoints.

## Secret handling

Never expose or send these from browser code: `SUPABASE_SERVICE_ROLE_KEY`, `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`, `OPENROUTER_API_KEY`, Resend keys, or VAPID private key. Public Supabase anon and VAPID public keys are explicitly intended for clients.
