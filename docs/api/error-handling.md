# API Error Handling

## HTTP envelopes

Primary envelope:

```ts
type Success<T> = { data: T; error: null };
type Failure = {
  data: null;
  error: { code: string; message: string; details?: unknown };
};
```

Supplier and venue routes use:

```ts
type LegacySuccess<T> = { success: true; data: T };
type LegacyFailure = {
  success: false;
  error: { code: string; message: string; details?: unknown };
};
```

PayMongo returns `{received:true,result:"processed|duplicate|skipped"}` on success. Maya returns `{received:true}`. Export routes return CSV or PDF, not JSON.

## Status codes

| Status    | Meaning in current code                                                                  |
| --------- | ---------------------------------------------------------------------------------------- |
| `200`     | Read/mutation success, webhook acknowledged, or export body                              |
| `201`     | Booking, venue, or supplier inquiry created                                              |
| `302/307` | Auth callback/logout redirect, selected by Next.js response implementation               |
| `400`     | Zod/server validation, invalid workflow state, or mapped database error                  |
| `401`     | No session or invalid webhook signature                                                  |
| `403`     | Authenticated but role/ownership/permission denied; disabled AI feature can also use 403 |
| `404`     | Supplier, venue/package, or related resource absent                                      |
| `409`     | Booking date/active-booking conflict                                                     |
| `429`     | AI usage or conversation limit                                                           |
| `500`     | Unexpected server/database/provider-processing failure                                   |
| `502`     | Upstream AI/provider returned invalid/unavailable output                                 |
| `503`     | Payment provider, booking workflow, push, or server configuration unavailable            |

## Common codes

| Code                                               | Source                                                                          |
| -------------------------------------------------- | ------------------------------------------------------------------------------- |
| `VALIDATION_ERROR`                                 | Zod/manual validation failed; `details` may be `flatten()` or `format()` output |
| `UNAUTHORIZED`, `AUTH_REQUIRED`, `UNAUTHENTICATED` | Missing valid session; naming differs by module                                 |
| `FORBIDDEN`                                        | Role, permission, organization ownership, or RLS denial                         |
| `NOT_FOUND`                                        | Public resource absent                                                          |
| `BOOKING_CONFLICT`                                 | Existing active booking or unavailable date                                     |
| `BOOKING_ACTION_FAILED`                            | Booking RPC/state transition rejected                                           |
| `INTERNAL_ERROR`, `SERVER_ERROR`                   | Unexpected failure; server logs hold details                                    |
| `PAYMENT_START_FAILED`, `REFUND_REQUEST_FAILED`    | Payment use-case/RPC rejection                                                  |
| `AI_LIMIT_EXCEEDED`                                | Database-configured AI usage check denied call                                  |
| `AI_MODERATION_BLOCKED`                            | Input moderation rejected text                                                  |

## Server Actions

Actions wrapped by `createServerAction` return:

```ts
type ActionResult<T> =
  | { data: T; error: null }
  | { data: null; error: { code: string; message: string; details?: unknown } };
```

Auth and partner actions use `{success:boolean,data?,error?,fieldErrors?}` instead. These are React Server Action contracts, not HTTP status contracts; application errors can travel over a successful framework transport response.

## Security rules

- Never return raw Supabase error objects, provider bodies, stack traces, tokens, or secrets.
- Webhook failures return generic public messages; detailed cause stays in server logs and `payment_webhook_events.error`.
- Auth callback maps provider failures to stable query codes and does not forward `error_description`.
- Validation details may reveal field names and constraints but must not echo secrets or credentials.

## Retry guidance

- Retry `502`, `503`, and transient `500` with bounded exponential backoff.
- Do not blindly retry non-idempotent venue/supplier inquiry creation.
- Payment checkout may be safely retried; database session attachment converges on the canonical checkout session.
- PayMongo retries are safe by event ID. A `500` asks provider to retry; `200 duplicate` means no more work.
- Do not retry `400`, `401`, `403`, `404`, or `409` without changing input/auth/state.
