# Venora API Specification

**Audience:** application and integration developers  
**Scope:** all active Next.js Route Handlers and Supabase Edge Functions on the
current release branch  
**Machine-readable companion:** [openapi.json](openapi.json) (OpenAPI 3.1)  
**Inspected surfaces:** 24 Next.js HTTP operations + 7 Edge Functions = **31**

This guide is the human-readable contract. Prefer it for examples and auth
notes; prefer OpenAPI for tooling. Server Actions and database RPCs are
non-REST surfaces — see [server-actions.md](server-actions.md) and
[supabase-rpc.md](supabase-rpc.md).

---

## Table of contents

1. [Base URLs and versioning](#1-base-urls-and-versioning)
2. [Authentication](#2-authentication)
3. [Response envelopes and headers](#3-response-envelopes-and-headers)
4. [HTTP status and error code reference](#4-http-status-and-error-code-reference)
5. [Endpoint catalog](#5-endpoint-catalog)
6. [Bookings](#6-bookings)
7. [Venues](#7-venues)
8. [Suppliers](#8-suppliers)
9. [Notifications and preferences](#9-notifications-and-preferences)
10. [Analytics and admin exports](#10-analytics-and-admin-exports)
11. [Webhooks](#11-webhooks)
12. [Auth callback and logout](#12-auth-callback-and-logout)
13. [Debug](#13-debug)
14. [Supabase Edge Functions](#14-supabase-edge-functions)
15. [Coverage checklist](#15-coverage-checklist)

---

## 1. Base URLs and versioning

| Surface           | Base URL                                                 |
| ----------------- | -------------------------------------------------------- |
| Next.js app       | `{NEXT_PUBLIC_APP_URL}` (local: `http://localhost:3000`) |
| Edge Functions    | `{SUPABASE_URL}/functions/v1`                            |
| Supabase REST RPC | `{SUPABASE_URL}/rest/v1/rpc/{function}`                  |

There is no `/v1` path prefix on Next.js routes. Breaking changes ship with
migration notes; OpenAPI is regenerated via `pnpm docs:generate`.

---

## 2. Authentication

### 2.1 Mechanisms

| Scheme              | How to send it                                                        | Used by                                       |
| ------------------- | --------------------------------------------------------------------- | --------------------------------------------- |
| Session cookie      | Browser cookies set by `@supabase/ssr` after login / `/auth/callback` | Most `/api/*` mutating and private reads      |
| Bearer access token | `Authorization: Bearer <supabase_access_token>`                       | Edge Functions; optional on several AI routes |
| Public anon key     | `apikey: <NEXT_PUBLIC_SUPABASE_ANON_KEY>`                             | Edge Function gateway                         |
| Webhook HMAC        | Provider signature header (see webhook sections)                      | PayMongo / Maya receivers                     |
| Service-role bearer | `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` (server-only)     | `booking-notifications` only                  |

OpenAPI security schemes:

- `supabaseSession` — cookie session for Next.js handlers
- `supabaseBearer` — JWT for Edge Functions

**Never** send `SUPABASE_SERVICE_ROLE_KEY`, PayMongo secrets, Resend keys, or
VAPID private keys from a browser.

### 2.2 Example authenticated browser request

```bash
# After logging in through the web UI, cookies are sent automatically:
curl -sS "http://localhost:3000/api/bookings" \
  -H "Cookie: sb-access-token=...; sb-refresh-token=..." \
  -H "Accept: application/json"
```

### 2.3 Example Edge Function request

```bash
curl -sS "${SUPABASE_URL}/functions/v1/ai-search" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"query":"garden venue in Cebu under 100000"}'
```

### 2.4 Role / permission matrix (HTTP)

| Surface                                    | Public | Session | Extra gate                                    |
| ------------------------------------------ | :----: | :-----: | --------------------------------------------- |
| Supplier list/detail, push public key      |  Yes   |    —    | —                                             |
| Bookings list/create, notifications, prefs |   No   |   Yes   | Own rows / RLS                                |
| Booking approve/decline                    |   No   |   Yes   | Venue org member/owner or admin               |
| Booking cancel/complete, payment, refund   |   No   |   Yes   | Workflow RPC                                  |
| Venue create                               |   No   |   Yes   | `venue_owner` / `event_coordinator` / `admin` |
| Venue-owner analytics export               |   No   |   Yes   | Same roles, scoped venues                     |
| Admin report export                        |   No   |   Yes   | Permission `reports.export`                   |
| PayMongo / Maya webhooks                   |   —    |    —    | Provider HMAC                                 |
| `/auth/callback`, `/logout`                | Yes\*  |    —    | One-time codes / sign-out                     |

\*Public entry points that establish or clear a session.

Details: [authentication.md](authentication.md).

---

## 3. Response envelopes and headers

### 3.1 Primary JSON envelope (bookings, notifications, payments, AI)

```json
{
  "data": {},
  "error": null
}
```

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

### 3.2 Legacy JSON envelope (venues, suppliers)

```json
{
  "success": true,
  "data": {}
}
```

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Supplier not found."
  }
}
```

### 3.3 Webhook acknowledgements

```json
{ "received": true, "result": "processed" }
```

```json
{ "received": true }
```

### 3.4 Common request headers

| Header               | When required                                       |
| -------------------- | --------------------------------------------------- |
| `Content-Type`       | `application/json` on JSON POST/PATCH/DELETE bodies |
| `Accept`             | Optional; prefer `application/json`                 |
| `Cookie`             | Session-authenticated Next.js routes                |
| `Authorization`      | Edge Functions (and service-role dispatcher)        |
| `apikey`             | Edge Functions                                      |
| `Paymongo-Signature` | PayMongo webhook only                               |
| `x-maya-signature`   | Maya webhook only                                   |

### 3.5 Binary / redirect responses

| Kind     | Endpoints                   | Notes                             |
| -------- | --------------------------- | --------------------------------- |
| CSV/PDF  | Analytics/admin export      | `Content-Disposition: attachment` |
| Redirect | `/auth/callback`, `/logout` | No JSON body                      |
| SSE      | `ai-assistant`              | `text/event-stream`               |
| Empty    | `GET /api/debug`            | Always `404`                      |

---

## 4. HTTP status and error code reference

### 4.1 Status codes

| Status        | Meaning in Venora                                      |
| ------------- | ------------------------------------------------------ |
| `200`         | Success (reads, updates, webhook ack, exports)         |
| `201`         | Resource created (booking, venue, supplier inquiry)    |
| `302` / `307` | Auth redirect                                          |
| `400`         | Validation or mapped workflow rejection                |
| `401`         | Missing session or invalid webhook signature           |
| `403`         | Authenticated but forbidden (role/permission/org)      |
| `404`         | Resource not found (or disabled debug route)           |
| `409`         | Booking conflict (active booking / unavailable date)   |
| `429`         | AI usage or conversation limit                         |
| `500`         | Unexpected server failure                              |
| `502`         | Upstream AI/provider invalid output                    |
| `503`         | Provider/config unavailable (payments, push, workflow) |

### 4.2 Application error codes

| Code                                                     | Typical status | Meaning                                                          |
| -------------------------------------------------------- | -------------- | ---------------------------------------------------------------- |
| `VALIDATION_ERROR`                                       | `400`          | Zod/manual validation failed; `details` may include field errors |
| `UNAUTHORIZED` / `AUTH_REQUIRED` / `UNAUTHENTICATED`     | `401`          | No valid session                                                 |
| `FORBIDDEN`                                              | `403`          | Role, permission, or ownership denied                            |
| `NOT_FOUND`                                              | `404`          | Resource missing                                                 |
| `BOOKING_CONFLICT`                                       | `409`          | Duplicate active booking / unavailable date                      |
| `BOOKING_ACTION_FAILED`                                  | `400`          | Booking RPC/state transition rejected                            |
| `BOOKING_WORKFLOW_UNAVAILABLE`                           | `503`          | Booking workflow dependency unavailable                          |
| `PAYMENT_START_FAILED`                                   | `4xx`/`5xx`    | Checkout start rejected                                          |
| `REFUND_REQUEST_FAILED` / `REFUND_FAILED`                | `4xx`/`5xx`    | Refund path rejected                                             |
| `CONTACT_REQUEST_FAILED`                                 | `400`          | Supplier inquiry insert failed                                   |
| `TRANSACTION_FAILED`                                     | `400`          | Venue create RPC failed                                          |
| `NOTIFICATION_READ_FAILED` / `NOTIFICATIONS_READ_FAILED` | `400`          | Mark-read RPC failed                                             |
| `PUSH_NOT_CONFIGURED`                                    | `503`          | Missing VAPID public key                                         |
| `INTERNAL_ERROR` / `SERVER_ERROR`                        | `500`          | Unexpected failure                                               |
| `AI_LIMIT_EXCEEDED`                                      | `429`          | AI quota exceeded                                                |
| `AI_FEATURE_DISABLED`                                    | `403`          | Feature flag off                                                 |
| `AI_MODERATION_BLOCKED`                                  | `400`          | Input blocked by moderation                                      |
| `CONFIGURATION_ERROR` / `OPENROUTER_NOT_CONFIGURED`      | `500`          | Edge misconfiguration                                            |

Full notes: [error-handling.md](error-handling.md).

### 4.3 Retry guidance

- Retry `502`, `503`, and transient `500` with bounded backoff.
- Do **not** blindly retry non-idempotent `POST /api/venues` or supplier contact.
- Payment start and PayMongo webhooks are designed for safe retries (session reuse / event claim).
- Do not retry `400`, `401`, `403`, `404`, or `409` without changing input or auth.

---

## 5. Endpoint catalog

### Next.js Route Handlers

| Method   | Path                                    | Auth                       |
| -------- | --------------------------------------- | -------------------------- |
| `GET`    | `/api/bookings`                         | Session                    |
| `POST`   | `/api/bookings`                         | Session                    |
| `PATCH`  | `/api/bookings/{id}/status`             | Session + role/RPC         |
| `POST`   | `/api/bookings/{id}/payment`            | Session                    |
| `POST`   | `/api/bookings/{id}/refund`             | Session                    |
| `POST`   | `/api/venues`                           | Session + role             |
| `GET`    | `/api/suppliers`                        | Public                     |
| `GET`    | `/api/suppliers/{id}`                   | Public                     |
| `POST`   | `/api/suppliers/{id}/contact`           | Session                    |
| `GET`    | `/api/notifications`                    | Session                    |
| `POST`   | `/api/notifications/{id}/read`          | Session                    |
| `POST`   | `/api/notifications/read-all`           | Session                    |
| `GET`    | `/api/notification-preferences`         | Session                    |
| `PATCH`  | `/api/notification-preferences`         | Session                    |
| `GET`    | `/api/notifications/push-public-key`    | Public                     |
| `POST`   | `/api/notifications/push-subscriptions` | Session                    |
| `DELETE` | `/api/notifications/push-subscriptions` | Session                    |
| `GET`    | `/api/analytics/venue-owner/export`     | Session + role             |
| `GET`    | `/api/admin/reports/export`             | Session + `reports.export` |
| `POST`   | `/api/webhooks/paymongo`                | HMAC                       |
| `POST`   | `/api/webhooks/maya`                    | HMAC                       |
| `GET`    | `/auth/callback`                        | Public (one-time code)     |
| `GET`    | `/logout`                               | Optional session           |
| `GET`    | `/api/debug`                            | Always `404`               |

### Edge Functions

| Method | Path                     | Auth                |
| ------ | ------------------------ | ------------------- |
| `POST` | `/ai-search`             | Optional bearer     |
| `POST` | `/ai-recommendation`     | Bearer required     |
| `POST` | `/ai-venue-description`  | Bearer + org/admin  |
| `POST` | `/ai-package-comparison` | Optional bearer     |
| `POST` | `/ai-cost-estimator`     | Optional bearer     |
| `POST` | `/ai-assistant`          | Optional bearer     |
| `POST` | `/booking-notifications` | Service-role bearer |

---

## 6. Bookings

### 6.1 `GET /api/bookings`

List the authenticated customer's bookings.

**Auth:** session cookie  
**Params:** none

**Success `200`**

```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "status": "pending",
      "event_date": "2026-09-15",
      "guest_count": 120,
      "total_amount": null,
      "deposit_amount": null,
      "payment_due_at": null,
      "venues": {
        "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "name": "Garden Hall",
        "slug": "garden-hall",
        "city": "Quezon City",
        "province": "Metro Manila"
      }
    }
  ],
  "error": null
}
```

**Errors:** `401` `UNAUTHORIZED` · `400` `BOOKING_ACTION_FAILED` · `409` `BOOKING_CONFLICT` · `500` `INTERNAL_ERROR`

---

### 6.2 `POST /api/bookings`

Create a booking inquiry.

**Auth:** session cookie  
**Headers:** `Content-Type: application/json`

**Request body**

| Field             | Type                  | Required | Constraints                   |
| ----------------- | --------------------- | -------- | ----------------------------- |
| `venueId`         | string (uuid)         | Yes      | Valid UUID                    |
| `packageId`       | string (uuid) \| null | No       | Optional package              |
| `eventDate`       | string                | Yes      | `YYYY-MM-DD`, today or future |
| `eventStartTime`  | string                | No       | `HH:mm` or empty              |
| `eventEndTime`    | string                | No       | `HH:mm` or empty              |
| `guestCount`      | number                | Yes      | Integer ≥ 1                   |
| `specialRequests` | string                | No       | Max 1000 chars                |

**Example request**

```json
{
  "venueId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "packageId": null,
  "eventDate": "2026-09-15",
  "eventStartTime": "14:00",
  "eventEndTime": "22:00",
  "guestCount": 120,
  "specialRequests": "Need outdoor ceremony setup."
}
```

**Success `201`**

```json
{
  "data": {
    "bookingId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "pending",
    "eventDate": "2026-09-15"
  },
  "error": null
}
```

**Errors:** `400` `VALIDATION_ERROR` · `401` `UNAUTHORIZED` · `409` `BOOKING_CONFLICT` · `503` `BOOKING_WORKFLOW_UNAVAILABLE` · `500` `INTERNAL_ERROR`

**Idempotency:** conflict guard blocks duplicate active booking for same venue/date; repeat may return `409`.

---

### 6.3 `PATCH /api/bookings/{id}/status`

Approve, decline, cancel, or complete a booking.

**Auth:** session cookie; approve/decline require org member/owner or admin  
**Path params:** `id` — booking UUID

**Request body (discriminated on `action`)**

Approve:

```json
{
  "action": "approve",
  "totalAmount": 85000,
  "depositAmount": 25000,
  "note": "Includes garden package."
}
```

Decline:

```json
{
  "action": "decline",
  "reason": "Date already reserved for another event."
}
```

Cancel:

```json
{
  "action": "cancel",
  "reason": "Customer schedule conflict."
}
```

Complete:

```json
{
  "action": "complete"
}
```

| Action     | Extra fields                                    | Constraints                   |
| ---------- | ----------------------------------------------- | ----------------------------- |
| `approve`  | `totalAmount`, `depositAmount`, optional `note` | Positive amounts; note ≤ 1000 |
| `decline`  | `reason`                                        | 5–500 chars                   |
| `cancel`   | optional `reason`                               | ≤ 500                         |
| `complete` | —                                               | —                             |

**Success `200`**

```json
{
  "data": {
    "bookingId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "approved"
  },
  "error": null
}
```

**Errors:** `400` `VALIDATION_ERROR` · `403` `FORBIDDEN` · `400` `BOOKING_ACTION_FAILED` · `500` `INTERNAL_ERROR`

---

### 6.4 `POST /api/bookings/{id}/payment`

Start or resume deposit checkout.

**Auth:** session cookie (booking customer via RPC)  
**Path params:** `id` — booking UUID

**Request body**

```json
{
  "provider": "paymongo"
}
```

| Field      | Type                                   | Required | Notes                                                            |
| ---------- | -------------------------------------- | -------- | ---------------------------------------------------------------- |
| `provider` | `"paymongo"` \| `"maya"` \| `"stripe"` | No       | Default `paymongo`. Only PayMongo is registered when configured. |

Empty body `{}` is valid.

**Success `200`**

```json
{
  "data": {
    "bookingId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "transactionId": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "amount": 25000,
    "provider": "paymongo",
    "checkoutUrl": "https://checkout.paymongo.com/cs_test_example",
    "status": "pending"
  },
  "error": null
}
```

**Errors:** `400` `VALIDATION_ERROR` · `401` `UNAUTHORIZED` · payment/mapped Venora errors · `500` `INTERNAL_ERROR` · `503` when provider unavailable

**Idempotency:** pending transaction lock and ~55-minute session reuse.

---

### 6.5 `POST /api/bookings/{id}/refund`

Request a refund for an eligible cancelled paid booking.

**Auth:** session cookie (customer, org member, or admin via RPC)  
**Path params:** `id` — booking UUID

**Request body**

```json
{
  "reason": "Event cancelled after payment."
}
```

| Field    | Type   | Required | Constraints      |
| -------- | ------ | -------- | ---------------- |
| `reason` | string | No       | Trimmed, max 500 |

**Success `200`**

```json
{
  "data": {
    "refundId": "d4e5f6a7-b8c9-0123-def0-234567890123",
    "bookingId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "amount": 25000,
    "status": "processing"
  },
  "error": null
}
```

**Errors:** `400` `VALIDATION_ERROR` · `401` `UNAUTHORIZED` · `REFUND_REQUEST_FAILED` / related · `500` `INTERNAL_ERROR`

---

## 7. Venues

### 7.1 `POST /api/venues`

Create a venue with packages and amenities (transactional RPC).

**Auth:** session + `venue_owner` \| `event_coordinator` \| `admin`  
**Headers:** `Content-Type: application/json`

**Example request**

```json
{
  "venue": {
    "organization_id": "e5f6a7b8-c9d0-1234-ef01-345678901234",
    "name": "Santos Garden Pavilion",
    "description": "Outdoor garden venue for weddings and corporate events.",
    "province": "Cavite",
    "city": "Tagaytay",
    "municipality": null,
    "address": "123 Ridge Road, Tagaytay",
    "capacity_min": 50,
    "capacity_max": 200,
    "base_price": 65000,
    "price_unit": "per_event",
    "indoor_outdoor": "both",
    "air_conditioned": false,
    "parking_available": true,
    "overnight_accommodation": false,
    "pet_friendly": false,
    "wheelchair_accessible": true,
    "has_pool": false,
    "ceremony_venue": true,
    "reception_venue": true
  },
  "packages": [
    {
      "name": "Garden Package",
      "description": "Full-day rental with basic setup.",
      "price": 85000,
      "price_unit": "per_event",
      "min_guests": 50,
      "max_guests": 150,
      "inclusions": ["Tables", "Chairs", "Basic lights"],
      "is_active": true
    }
  ],
  "amenities": ["Parking", "WiFi", "Generator"]
}
```

**Success `201`**

```json
{
  "success": true,
  "data": {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "slug": "santos-garden-pavilion",
    "status": "pending"
  }
}
```

_(Exact `data` fields follow `create_venue_transaction` RPC return shape.)_

**Errors:** `401` `AUTH_REQUIRED` · `400` `VALIDATION_ERROR` · `403` `FORBIDDEN` · `400` `TRANSACTION_FAILED` · `500` `SERVER_ERROR`

**Idempotency:** not idempotent — repeats can create another venue.

> There is no `GET /api/venues` list/detail Route Handler. Venue discovery uses
> Server Components, Supabase queries, and `ai-search`.

---

## 8. Suppliers

### 8.1 `GET /api/suppliers`

Public marketplace search.

**Auth:** public  
**Query parameters**

| Param                   | Type    | Default       | Constraints                                      |
| ----------------------- | ------- | ------------- | ------------------------------------------------ |
| `q`                     | string  | —             | Max 120                                          |
| `category`              | string  | —             | Max 80                                           |
| `location`              | string  | —             | Max 120                                          |
| `minPrice` / `maxPrice` | number  | —             | Optional                                         |
| `minRating`             | number  | —             | Optional                                         |
| `accreditedOnly`        | boolean | `true`        | Coerced                                          |
| `sort`                  | string  | `recommended` | `recommended` \| `rating` \| `price` \| `newest` |
| `page`                  | integer | `1`           | ≥ 1                                              |
| `limit`                 | integer | `24`          | 1–100                                            |

**Example**

```bash
curl -sS "http://localhost:3000/api/suppliers?page=1&limit=24&sort=recommended&q=catering"
```

**Success `200`**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "f6a7b8c9-d0e1-2345-f012-456789012345",
        "businessName": "Island Feast Catering",
        "slug": "island-feast-catering",
        "avgRating": 4.7,
        "isFeatured": true
      }
    ],
    "categories": [{ "id": "...", "name": "Catering", "slug": "catering" }],
    "page": 1,
    "limit": 24,
    "totalItems": 42,
    "totalPages": 2
  }
}
```

**Errors:** `400` `VALIDATION_ERROR` · `500` `SERVER_ERROR`

> On empty/error DB results the handler may return bundled sample suppliers.

---

### 8.2 `GET /api/suppliers/{id}`

Public supplier detail. Path `{id}` is treated as a **slug** (or UUID when the
path matches UUID syntax, depending on lookup helpers).

**Auth:** public

**Success `200`**

```json
{
  "success": true,
  "data": {
    "id": "f6a7b8c9-d0e1-2345-f012-456789012345",
    "businessName": "Island Feast Catering",
    "slug": "island-feast-catering",
    "accreditationStatus": "accredited"
  }
}
```

**Errors:** `404` `NOT_FOUND` · `500` `SERVER_ERROR`

---

### 8.3 `POST /api/suppliers/{id}/contact`

Create a supplier contact / inquiry request.

**Auth:** session cookie  
**Path params:** `id` — supplier profile UUID (merged as `supplierId`)

**Request body**

| Field           | Type   | Required | Constraints  |
| --------------- | ------ | -------- | ------------ |
| `contactName`   | string | Yes      | 2–120        |
| `contactEmail`  | string | Yes      | Valid email  |
| `contactPhone`  | string | No       | 7–32         |
| `serviceId`     | uuid   | No       |              |
| `bookingId`     | uuid   | No       |              |
| `eventDate`     | string | No       | `YYYY-MM-DD` |
| `eventLocation` | string | No       | Max 160      |
| `guestCount`    | number | No       | > 0          |
| `message`       | string | Yes      | 10–1500      |

**Example request**

```json
{
  "contactName": "Ana Reyes",
  "contactEmail": "ana@example.test",
  "contactPhone": "+639171234567",
  "eventDate": "2026-10-10",
  "eventLocation": "Tagaytay",
  "guestCount": 100,
  "message": "Looking for a plated dinner package for a garden wedding."
}
```

**Success `201`**

```json
{
  "success": true,
  "data": {
    "id": "a7b8c9d0-e1f2-3456-0123-567890123456",
    "status": "pending",
    "created_at": "2026-07-22T02:00:00.000Z"
  }
}
```

**Errors:** `401` `AUTH_REQUIRED` · `400` `VALIDATION_ERROR` · `404` `NOT_FOUND` · `400` `CONTACT_REQUEST_FAILED` · `500` `SERVER_ERROR`

---

## 9. Notifications and preferences

### 9.1 `GET /api/notifications`

**Auth:** session  
**Query:** `limit` (1–100, default 20), `read` (`all`\|`unread`\|`read`), optional `kind`

**Success `200`**

```json
{
  "data": {
    "notifications": [
      {
        "id": "b8c9d0e1-f2a3-4567-1234-678901234567",
        "userId": "c9d0e1f2-a3b4-5678-2345-789012345678",
        "channel": "in_app",
        "kind": "booking_update",
        "title": "Booking approved",
        "body": "Your booking at Garden Hall was approved.",
        "link": "/bookings/a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "metadata": {},
        "priority": "normal",
        "isRead": false,
        "readAt": null,
        "createdAt": "2026-07-22T02:00:00.000Z"
      }
    ],
    "unreadCount": 3
  },
  "error": null
}
```

**Errors:** `400` `VALIDATION_ERROR` · `401` `UNAUTHORIZED` · `500` `INTERNAL_ERROR`

---

### 9.2 `POST /api/notifications/{id}/read`

**Auth:** session · **Body:** none · **Path:** notification UUID

**Success `200`**

```json
{
  "data": { "id": "b8c9d0e1-f2a3-4567-1234-678901234567" },
  "error": null
}
```

**Errors:** `401` `UNAUTHORIZED` · `400` `NOTIFICATION_READ_FAILED` · `500` `INTERNAL_ERROR`

---

### 9.3 `POST /api/notifications/read-all`

**Auth:** session · **Body:** none

**Success `200`**

```json
{
  "data": { "markedCount": 5 },
  "error": null
}
```

**Errors:** `401` `UNAUTHORIZED` · `400` `NOTIFICATIONS_READ_FAILED` · `500` `INTERNAL_ERROR`

---

### 9.4 `GET /api/notification-preferences`

**Auth:** session

**Success `200`**

```json
{
  "data": {
    "userId": "c9d0e1f2-a3b4-5678-2345-789012345678",
    "emailEnabled": true,
    "smsEnabled": false,
    "pushEnabled": true,
    "inAppEnabled": true,
    "bookingUpdates": true,
    "paymentUpdates": true,
    "reviewRequests": true,
    "adminAlerts": false,
    "quietHoursStart": null,
    "quietHoursEnd": null,
    "timezone": "Asia/Manila"
  },
  "error": null
}
```

---

### 9.5 `PATCH /api/notification-preferences`

**Auth:** session

**Example request**

```json
{
  "emailEnabled": true,
  "pushEnabled": true,
  "inAppEnabled": true,
  "bookingUpdates": true,
  "paymentUpdates": true,
  "reviewRequests": false,
  "adminAlerts": false,
  "quietHoursStart": "22:00",
  "quietHoursEnd": "07:00",
  "timezone": "Asia/Manila"
}
```

Notes: `smsEnabled` is always stored as `false` (SMS disabled). Quiet hours are
nullable `HH:mm`. Timezone length 1–64.

**Success `200`:** same mapped preferences shape as GET.  
**Errors:** `400` `VALIDATION_ERROR` · `401` `UNAUTHORIZED` · `500` `INTERNAL_ERROR`

---

### 9.6 `GET /api/notifications/push-public-key`

**Auth:** public

**Success `200`**

```json
{
  "data": { "publicKey": "<VAPID_PUBLIC_KEY>" },
  "error": null
}
```

**Errors:** `503` `PUSH_NOT_CONFIGURED`

---

### 9.7 `POST /api/notifications/push-subscriptions`

**Auth:** session

**Request body**

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/example-endpoint",
  "keys": {
    "p256dh": "BNcRdyt...at-least-16-chars...",
    "auth": "tBHI...at-least-8..."
  },
  "userAgent": "Mozilla/5.0 ..."
}
```

**Success `200`**

```json
{
  "data": { "subscriptionId": "d0e1f2a3-b4c5-6789-3456-890123456789" },
  "error": null
}
```

---

### 9.8 `DELETE /api/notifications/push-subscriptions`

**Auth:** session

**Request body**

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/example-endpoint"
}
```

**Success `200`**

```json
{
  "data": { "disabled": true },
  "error": null
}
```

---

## 10. Analytics and admin exports

### 10.1 `GET /api/analytics/venue-owner/export`

**Auth:** session + role `venue_owner` \| `event_coordinator` \| `admin`

**Query**

| Param    | Values         | Default                    |
| -------- | -------------- | -------------------------- |
| `format` | `csv` \| `pdf` | `csv`                      |
| `from`   | `YYYY-MM-DD`   | optional                   |
| `to`     | `YYYY-MM-DD`   | optional; must be ≥ `from` |

**Success `200`:** binary CSV (`text/csv; charset=utf-8`) or PDF (`application/pdf`)
with `Content-Disposition: attachment`.

**Errors:** `400` `VALIDATION_ERROR` · `401` `UNAUTHORIZED` · `403` `FORBIDDEN`

---

### 10.2 `GET /api/admin/reports/export`

**Auth:** session + permission `reports.export`  
**Query:** same as venue-owner export  
**Success:** binary CSV/PDF  
**Errors:** `400` `VALIDATION_ERROR` · `401` `UNAUTHENTICATED` · `403` `FORBIDDEN`

Side effect: writes export/audit rows via `log_report_export`.

---

## 11. Webhooks

Details: [webhooks.md](webhooks.md).

### 11.1 `POST /api/webhooks/paymongo`

**Auth:** header `Paymongo-Signature` (HMAC) verified with `PAYMONGO_WEBHOOK_SECRET`  
**Body:** raw provider payload (do not re-serialize before verification)

**Success `200`**

```json
{ "received": true, "result": "processed" }
```

`result` may also be `"duplicate"` or `"skipped"`.

**Errors:** `401` `{ "error": "Invalid signature" }` · `503` `{ "error": "Provider not configured" }` · `500` `{ "error": "Processing failed" }`

**Idempotency:** provider event ID claim — duplicates return `200` with `result: "duplicate"`.

---

### 11.2 `POST /api/webhooks/maya`

**Auth:** header `x-maya-signature` (HMAC-SHA512) vs `MAYA_WEBHOOK_SECRET`

**Success `200`:** `{ "received": true }`  
**Errors:** `401` `{ "error": "Invalid signature" }` · `500` `{ "error": "Processing failed" }`

> Maya success reconciliation is **not production-ready**. Only PayMongo is a
> usable checkout gateway when configured.

---

## 12. Auth callback and logout

### 12.1 `GET /auth/callback`

Finish OAuth/PKCE or hand off email tokens.

**Query params:** `code`, `token_hash`, `type`, `next`, `error`  
**Success:** HTTP redirect to role-aware destination  
**Failure redirects:** `/login?error=oauth_cancelled|oauth_provider_error|oauth_callback_failed|account_restricted`

No JSON body. Do not log one-time codes.

### 12.2 `GET /logout`

Signs out, clears Supabase auth cookies, redirects to `/`.

---

## 13. Debug

### `GET /api/debug`

Compatibility stub. **Always returns empty `404`.** No diagnostics are exposed.

---

## 14. Supabase Edge Functions

All accept `POST` and CORS `OPTIONS`. Base:
`{SUPABASE_URL}/functions/v1/{name}`.

Required headers for client calls:

```http
apikey: <SUPABASE_ANON_KEY>
Authorization: Bearer <access_token_or_anon_as_documented>
Content-Type: application/json
```

### 14.1 `POST /ai-search`

**Auth:** optional bearer  
**Body:** `query` and/or `filters` (requires at least one)

```json
{
  "query": "garden venue in Tagaytay under 100k",
  "filters": {
    "province": "Cavite",
    "city": "Tagaytay",
    "max_budget": 100000,
    "guests": 100,
    "venue_types": ["garden"],
    "page": 1,
    "per_page": 24,
    "sort_by": "relevance"
  }
}
```

**Success `200`:** `{ "data": { "venues": [...], "parsedFilters": {...}, "searchParameters": {...}, "fallbackReason": null }, "error": null }`

**Errors:** `400` `VALIDATION_ERROR` / `AI_MODERATION_BLOCKED` · `500` config/search failures

---

### 14.2 `POST /ai-recommendation`

**Auth:** bearer **required** · **Body:** `{}`

**Success `200`**

```json
{
  "data": {
    "venues": [
      { "id": "...", "name": "...", "slug": "...", "basePrice": 50000 }
    ],
    "recommendationEventIds": { "<venueId>": "<eventId>" },
    "mode": "personalized",
    "preferenceQuery": "elegant garden venues under mid budget"
  },
  "error": null
}
```

`mode` is `"personalized"` or `"cold_start"`.  
**Errors:** `401` `UNAUTHORIZED` · `500` recommendation/config failures

---

### 14.3 `POST /ai-venue-description`

**Auth:** bearer + venue org member or admin

```json
{
  "venueId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "contentType": "description",
  "tone": "elegant"
}
```

`contentType`: `description` \| `seo_meta` \| `package_description`  
`packageId` required when `contentType` is `package_description`.

**Success `200`**

```json
{
  "data": {
    "content": {
      "id": "...",
      "venueId": "...",
      "contentType": "description",
      "generatedText": "...",
      "status": "draft",
      "createdAt": "2026-07-22T02:00:00.000Z"
    }
  },
  "error": null
}
```

Draft only — never auto-publishes.  
**Errors:** `401` · `403` · `404` · `429` `AI_LIMIT_EXCEEDED` · `502` generation failures

---

### 14.4 `POST /ai-package-comparison`

**Auth:** optional bearer

```json
{
  "packageIds": [
    "11111111-1111-1111-1111-111111111111",
    "22222222-2222-2222-2222-222222222222"
  ]
}
```

Requires 2–4 unique package UUIDs (`package_ids` alias accepted).

**Success `200`:** `{ "data": { "comparisonTable": [...], "aiSummary": {...} }, "error": null }`  
(`aiSummary` may be `null` if AI skipped.)

---

### 14.5 `POST /ai-cost-estimator`

**Auth:** optional bearer

```json
{
  "venueId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "guestCount": 100,
  "eventType": "wedding",
  "durationHours": 8,
  "includesCatering": true,
  "includesAV": false
}
```

**Success `200`**

```json
{
  "data": {
    "estimate": {
      "baseVenue": 50000,
      "packages": 20000,
      "catering": 30000,
      "av": 0,
      "total": 100000,
      "breakdown": ["Venue rental ..."]
    },
    "venue": { "id": "...", "name": "...", "basePrice": 50000 }
  },
  "error": null
}
```

---

### 14.6 `POST /ai-assistant`

**Auth:** optional bearer (unlocks own booking context)  
**Body:** `sessionId` (required, ≤100), `message` (required, ≤2000), optional `conversationId`

**Success `200`:** Server-Sent Events (`text/event-stream`). First event includes
`conversationId`, then streamed model chunks.

**Errors:** `400` validation/moderation · `403` feature disabled · `429` limits · `502` assistant failed · `500` config

---

### 14.7 `POST /booking-notifications`

**Auth:** exact service-role bearer (constant-time compare)  
**Not for browsers.**

Single delivery:

```json
{
  "record": {
    "id": "...",
    "notification_id": "...",
    "user_id": "...",
    "channel": "email"
  }
}
```

Batch:

```json
{ "limit": 25 }
```

**Success `200`:** `{ "success": true }` or batch summary with counts.  
**Errors:** `401` · `503` not configured · `500`

---

## 15. Coverage checklist

| #   | Operation                                      | Documented path | Example payload | Status codes |
| --- | ---------------------------------------------- | --------------- | --------------- | ------------ |
| 1   | `GET /api/bookings`                            | Yes             | Yes             | Yes          |
| 2   | `POST /api/bookings`                           | Yes             | Yes             | Yes          |
| 3   | `PATCH /api/bookings/{id}/status`              | Yes             | Yes             | Yes          |
| 4   | `POST /api/bookings/{id}/payment`              | Yes             | Yes             | Yes          |
| 5   | `POST /api/bookings/{id}/refund`               | Yes             | Yes             | Yes          |
| 6   | `POST /api/venues`                             | Yes             | Yes             | Yes          |
| 7   | `GET /api/suppliers`                           | Yes             | Yes             | Yes          |
| 8   | `GET /api/suppliers/{id}`                      | Yes             | Yes             | Yes          |
| 9   | `POST /api/suppliers/{id}/contact`             | Yes             | Yes             | Yes          |
| 10  | `GET /api/notifications`                       | Yes             | Yes             | Yes          |
| 11  | `POST /api/notifications/{id}/read`            | Yes             | Yes             | Yes          |
| 12  | `POST /api/notifications/read-all`             | Yes             | Yes             | Yes          |
| 13  | `GET /api/notification-preferences`            | Yes             | Yes             | Yes          |
| 14  | `PATCH /api/notification-preferences`          | Yes             | Yes             | Yes          |
| 15  | `GET /api/notifications/push-public-key`       | Yes             | Yes             | Yes          |
| 16  | `POST /api/notifications/push-subscriptions`   | Yes             | Yes             | Yes          |
| 17  | `DELETE /api/notifications/push-subscriptions` | Yes             | Yes             | Yes          |
| 18  | `GET /api/analytics/venue-owner/export`        | Yes             | Binary noted    | Yes          |
| 19  | `GET /api/admin/reports/export`                | Yes             | Binary noted    | Yes          |
| 20  | `POST /api/webhooks/paymongo`                  | Yes             | Yes             | Yes          |
| 21  | `POST /api/webhooks/maya`                      | Yes             | Yes             | Yes          |
| 22  | `GET /auth/callback`                           | Yes             | Redirect        | Yes          |
| 23  | `GET /logout`                                  | Yes             | Redirect        | Yes          |
| 24  | `GET /api/debug`                               | Yes             | Empty 404       | Yes          |
| 25  | `POST /ai-search`                              | Yes             | Yes             | Yes          |
| 26  | `POST /ai-recommendation`                      | Yes             | Yes             | Yes          |
| 27  | `POST /ai-venue-description`                   | Yes             | Yes             | Yes          |
| 28  | `POST /ai-package-comparison`                  | Yes             | Yes             | Yes          |
| 29  | `POST /ai-cost-estimator`                      | Yes             | Yes             | Yes          |
| 30  | `POST /ai-assistant`                           | Yes             | SSE noted       | Yes          |
| 31  | `POST /booking-notifications`                  | Yes             | Yes             | Yes          |

**Coverage:** 31 / 31 active HTTP operations (100%).

Validate with:

```bash
pnpm docs:generate
pnpm docs:validate
pnpm docs:semantic:validate
```

Related guides: [README.md](README.md) · [authentication.md](authentication.md) ·
[error-handling.md](error-handling.md) · [endpoint-inventory.md](endpoint-inventory.md) ·
[openapi.json](openapi.json).
