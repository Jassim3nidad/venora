# Venora API

Code-backed API reference for the current `main` branch. Regenerate the machine
contract with `pnpm docs:generate` and verify coverage with `pnpm docs:validate`.

## Start here

| Document                                    | Use when                                                                                                          |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **[API Specification](specification.md)**   | Developer-friendly guide: every active endpoint with methods, auth, params, example JSON, and status/error tables |
| **[OpenAPI 3.1](openapi.json)**             | Tooling, codegen, Redocly/Swagger UI                                                                              |
| [Authentication](authentication.md)         | Session cookies, Edge bearers, role matrix                                                                        |
| [Error handling](error-handling.md)         | Envelopes, HTTP statuses, application error codes                                                                 |
| [Endpoint inventory](endpoint-inventory.md) | Coverage matrix vs source files                                                                                   |
| [Webhooks](webhooks.md)                     | PayMongo receiver                                                                                                 |
| [Server Actions](server-actions.md)         | Non-REST Server Action entry points                                                                               |
| [Supabase RPC](supabase-rpc.md)             | Database function inventory                                                                                       |
| [Storage](storage.md)                       | Bucket upload contracts                                                                                           |

## Scope and authority

This reference covers every confirmed Next.js Route Handler, Next.js Server Action, public PostgreSQL function, Supabase Edge Function, webhook, and storage workflow in this repository. It does not turn Server Actions or RPCs into invented REST routes.

Contract precedence:

1. deployed database and code on the inspected branch;
2. [OpenAPI 3.1](openapi.json) for HTTP surfaces;
3. [API Specification](specification.md) for human examples and auth notes;
4. this directory for non-REST surfaces;
5. older design documents only as background.

Base URLs:

- Next.js: `NEXT_PUBLIC_APP_URL`, normally `http://localhost:3000` locally.
- Edge Functions: `${SUPABASE_URL}/functions/v1`.
- Supabase REST RPC: `${SUPABASE_URL}/rest/v1/rpc/{function}`. Use only functions whose access column permits the caller.

## Shared HTTP conventions

Most current handlers return:

```json
{
  "data": {},
  "error": null
}
```

or:

```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input.",
    "details": {}
  }
}
```

Venue and supplier handlers instead use `{ "success": true, "data": ... }` or `{ "success": false, "error": ... }`. Webhooks use provider-specific acknowledgements. See [error handling](error-handling.md) and the full tables in [API Specification](specification.md).

Browser Route Handlers authenticate with Supabase session cookies. Edge Functions accept `Authorization: Bearer <Supabase access token>`; some allow anonymous use and only attach a user when a valid token exists. Never send service-role keys from a browser.

## Next.js Route Handlers

`None` in the rate-limit column means no application-level limiter was found. Provider, Vercel, or Supabase platform limits may still apply.

| Method and route                               | Purpose                                               | Authentication and role                                                                                | Input validation                                                                                                 | Data and side effects                                                                                                                         | Idempotency                                                                                         | Rate limit               |
| ---------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------ |
| `GET /api/bookings`                            | List current customer's bookings                      | Session; any authenticated customer context                                                            | None                                                                                                             | Reads `bookings`, `venues`                                                                                                                    | Safe                                                                                                | None                     |
| `POST /api/bookings`                           | Create booking inquiry                                | Session; authenticated user, RPC/RLS enforces eligibility                                              | `createBookingSchema`: UUID venue/package, future `YYYY-MM-DD`, optional `HH:mm`, guests >= 1, requests <= 1,000 | `create_booking_inquiry`; writes booking/history/notifications and revalidates booking/venue pages                                            | Conflict guard prevents duplicate active booking for same venue/date; repeat can return `409`       | None                     |
| `PATCH /api/bookings/{id}/status`              | Approve, decline, cancel, or complete booking         | Session. Approve/decline: venue organization member/owner or admin. Cancel/complete: RPC authorization | Discriminated action. Approve positive amounts; decline reason 5-500; cancel reason <= 500                       | Booking workflow RPCs; invoice/notifications/audit/availability may change; cache revalidation                                                | State-machine protected; repeat usually fails or returns current-state error                        | None                     |
| `POST /api/bookings/{id}/payment`              | Start or resume deposit checkout                      | Session; booking customer through `start_booking_payment`                                              | Optional provider enum: `paymongo`, `stripe`; default `paymongo`                                                 | Creates/reuses `transactions`, creates hosted checkout, attaches provider session, sets payment pending                                       | Yes. Pending transaction lock, 55-minute session reuse, first-attach-wins race guard                | Provider limits only     |
| `POST /api/bookings/{id}/refund`               | Request refund for cancelled paid booking             | Session; customer, venue organization member, or admin through RPC                                     | Optional trimmed reason <= 500                                                                                   | Creates `refunds`, calls provider, marks processing/completed, later webhook reconciliation                                                   | DB prevents refund exceeding eligible paid amount; provider retry behavior depends on stored refund | Provider limits only     |
| `POST /api/venues`                             | Create venue, packages, and amenities transactionally | Session; `venue_owner`, `event_coordinator`, or `admin`; organization access rechecked by RPC          | Nested Zod schema; UUID organization, name/location/capacity/positive prices, enums, package rules               | `create_venue_transaction`; inserts venue, packages, amenities                                                                                | Not idempotent; repeat can create another venue                                                     | None                     |
| `GET /api/suppliers`                           | Public supplier marketplace search                    | Public                                                                                                 | Query: `q<=120`, category<=80, location<=120, numeric price/rating, sort enum, page>=1, limit 1-100              | Reads supplier profile/category/service/portfolio/review data. Falls back to bundled sample suppliers when DB result is empty or errors       | Safe                                                                                                | None                     |
| `GET /api/suppliers/{id}`                      | Public supplier detail by UUID or slug                | Public                                                                                                 | Path interpreted as UUID when it matches UUID syntax, otherwise slug                                             | Reads accredited supplier relations; may fall back to sample supplier                                                                         | Safe                                                                                                | None                     |
| `POST /api/suppliers/{id}/contact`             | Create supplier inquiry                               | Session; authenticated user                                                                            | Contact name 2-120, valid email, optional phone 7-32, date, positive guests, message 10-1,500                    | Inserts `supplier_contact_requests`; DB notification triggers may run                                                                         | Not idempotent                                                                                      | None                     |
| `GET /api/notifications`                       | List current user's notifications and unread count    | Session                                                                                                | `limit` 1-100; `read=all\|read\|unread`; optional kind enum                                                      | Ensures preferences, reads non-expired `notifications`                                                                                        | Safe except preference bootstrap                                                                    | None                     |
| `POST /api/notifications/{id}/read`            | Mark one owned notification read                      | Session                                                                                                | UUID is expected by RPC/database type                                                                            | `mark_notification_read`; sets read fields                                                                                                    | Yes                                                                                                 | None                     |
| `POST /api/notifications/read-all`             | Mark all current user's notifications read            | Session                                                                                                | None                                                                                                             | `mark_all_notifications_read`; returns count                                                                                                  | Yes                                                                                                 | None                     |
| `GET /api/notification-preferences`            | Read/bootstrap current preferences                    | Session                                                                                                | None                                                                                                             | `ensure_notification_preferences` may insert defaults                                                                                         | Yes                                                                                                 | None                     |
| `PATCH /api/notification-preferences`          | Update current preferences                            | Session                                                                                                | Booleans; nullable `HH:mm` quiet hours; timezone 1-64                                                            | Upserts `notification_preferences`; SMS is always stored disabled                                                                             | Yes, last write wins                                                                                | None                     |
| `GET /api/notifications/push-public-key`       | Return public VAPID key                               | Public                                                                                                 | None                                                                                                             | Reads public environment value only                                                                                                           | Safe                                                                                                | None                     |
| `POST /api/notifications/push-subscriptions`   | Register browser push subscription                    | Session                                                                                                | URL endpoint; `p256dh` >= 16; auth >= 8; agent <= 500                                                            | Upserts `push_subscriptions` by user and endpoint                                                                                             | Yes                                                                                                 | None                     |
| `DELETE /api/notifications/push-subscriptions` | Disable push subscription                             | Session                                                                                                | Valid endpoint URL                                                                                               | Sets `disabled_at` on owned subscription                                                                                                      | Yes                                                                                                 | None                     |
| `GET /api/analytics/venue-owner/export`        | Export scoped venue analytics as CSV/PDF              | Session; venue owner, coordinator, or admin                                                            | `format=csv\|pdf`; valid optional dates with `from<=to`                                                          | Reads scoped analytics queries; binary download; no DB write                                                                                  | Safe                                                                                                | None                     |
| `GET /api/admin/reports/export`                | Export platform analytics as CSV/PDF                  | Session; admin permission `reports.export`                                                             | Same export query                                                                                                | Reads platform analytics; `log_report_export` writes export and audit rows                                                                    | Not strictly safe because each call creates audit/export records                                    | None                     |
| `POST /api/webhooks/paymongo`                  | Receive PayMongo payment/refund events                | `Paymongo-Signature` HMAC; no user session                                                             | Raw body parsed only after signature verification                                                                | Claims `payment_webhook_events`; confirms/fails payment/refund; creates receipts/invoices/commissions/notifications/audit through DB workflow | Yes, provider event ID claim. Duplicate returns `200 duplicate`; failed event remains reclaimable   | Provider delivery limits |
| `GET /auth/callback`                           | Supabase OAuth/PKCE callback and email-token handoff  | Public callback with one-time code/token                                                               | Query `code`, `token_hash`, `type`, `next`, provider `error`                                                     | Exchanges code for session, reads role/profile, redirects; raw provider errors are not exposed                                                | One-time codes/tokens                                                                               | Supabase Auth limits     |
| `GET /logout`                                  | Sign out and clear Supabase auth cookies              | Session optional                                                                                       | None                                                                                                             | Calls Supabase sign-out, clears auth cookies, redirects `/`                                                                                   | Yes                                                                                                 | None                     |
| `GET /api/debug`                               | Disabled diagnostic route                             | Public 404                                                                                             | None                                                                                                             | Always returns an empty `404`; no user, inquiry, environment, stack, or configuration data                                                    | Safe and side-effect free                                                                           | None                     |

Detailed request/response schemas, examples, headers, path/query parameters, status codes, and security declarations are in [API Specification](specification.md) and [openapi.json](openapi.json).

## Supabase Edge Functions

All accept `POST` and CORS `OPTIONS`. Their OpenAPI operations use the Edge Function server.

| Function                | Auth                                                          | Request                                                                                                 | Response and side effects                                                                              | Rate/idempotency                                                                  |
| ----------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `ai-search`             | Token optional; search is public                              | `query<=500` and/or filters for location, budget, guests, venue type/features, `per_page<=50` effective | OpenRouter intent parsing plus database-grounded `search_venues`; writes search/usage logs             | Admin AI limits when LLM parsing runs; each call logs                             |
| `ai-recommendation`     | Bearer token required                                         | Empty JSON object                                                                                       | Returns 8 personalized/cold-start venues and event IDs; writes recommendation impressions and AI usage | Admin AI limits; repeat creates new impression events                             |
| `ai-venue-description`  | Bearer; venue organization member or admin                    | UUID venue, content type, optional package UUID, tone enum                                              | Creates draft `ai_generated_content`; never publishes automatically                                    | Admin AI limits; not idempotent                                                   |
| `ai-package-comparison` | Token optional                                                | 2-4 unique package UUIDs                                                                                | Deterministic table plus optional AI narrative; writes comparison log                                  | AI summary may be skipped when disabled/limited; repeat logs                      |
| `ai-cost-estimator`     | Token optional                                                | Venue UUID, positive guests/duration, event type <= 60, catering/AV flags                               | Validated PHP cost breakdown; writes approved estimate record and usage log                            | Admin AI limits; not idempotent                                                   |
| `ai-assistant`          | Token optional; token unlocks own booking context             | `sessionId<=100`, message<=2,000, optional conversation UUID/string<=100                                | SSE stream; writes conversation/messages/usage; at most 100 messages per conversation                  | Admin AI limit plus conversation limit; not idempotent                            |
| `booking-notifications` | Exact service-role bearer; invoked by DB webhook/service role | Delivery record, or `{limit}` batch request                                                             | Dispatches email/push/in-app, updates delivery attempts/statuses; SMS skipped                          | Constant-time bearer check; batch clamped to 1-100; queue status controls repeats |

## Non-REST references

- [Server Actions](server-actions.md): confirmed action entry points, including route-local adapters.
- [Supabase RPC functions](supabase-rpc.md): final database function names, including callable RPCs and internal trigger/helpers.
- [Storage](storage.md): four buckets and signed/direct upload flows.
- [Webhooks](webhooks.md): PayMongo reconciliation.
- [Endpoint inventory](endpoint-inventory.md): documented/undocumented coverage.

## Example

```bash
curl -sS "http://localhost:3000/api/suppliers?page=1&limit=24&sort=recommended"
```

Authenticated browser APIs use the Supabase session cookie established by the app. Edge Function example:

```bash
curl -sS "${SUPABASE_URL}/functions/v1/ai-search" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"query":"garden venue in Cebu under 100000"}'
```

Use placeholders only. Never place access tokens or keys in documentation, logs, or committed scripts.

## Confirmed gaps and risks

- `/api/debug` remains only as a disabled compatibility route. It always returns an empty `404`; its former diagnostic lookup was removed after security verification.
- `PAYMENT_PROVIDERS` advertises Stripe for future integration, while only PayMongo is registered when configured. Selecting an unregistered provider returns a mapped payment error.
- No application-level rate limiter protects Next.js Route Handlers. AI Edge Functions enforce database-configured usage limits only around AI calls; deterministic fallbacks can remain available.
- Response envelopes are mixed across modules. Clients must follow each operation schema instead of assuming one global envelope.
- `GET /api/suppliers` and supplier detail can return bundled sample data after DB failure, which can mask availability incidents.
- Edge Function JWT deployment settings are not pinned per function in `supabase/config.toml`; production configuration must preserve JWT verification. `booking-notifications` additionally checks the exact service-role bearer in function code.
