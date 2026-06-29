# Error Handling Conventions — Venora

> See also: [api-conventions.md](./api-conventions.md)

---

## 1. Error Class Hierarchy

```
VenoraError (base)           httpStatus: 500
├── NotFoundError            httpStatus: 404  code: "NOT_FOUND"
├── ForbiddenError           httpStatus: 403  code: "FORBIDDEN"
├── UnauthorizedError        httpStatus: 401  code: "UNAUTHORIZED"
├── ValidationError          httpStatus: 400  code: "VALIDATION_ERROR"
├── ConflictError            httpStatus: 409  code: "CONFLICT"
│   └── BookingConflictError             code: "BOOKING_CONFLICT"
└── PaymentError             httpStatus: 402  code: "PAYMENT_ERROR"
    ├── PaymentCaptureError              code: "PAYMENT_CAPTURE_FAILED"
    └── RefundError                      code: "REFUND_FAILED"
```

See implementation: [`src/lib/errors.ts`](../../apps/web/src/lib/errors.ts)

---

## 2. Where Errors Are Caught

| Layer | Catches | Action |
|---|---|---|
| Domain entities | Invalid state transitions | Throws `VenoraError` |
| Use cases | Repo errors, domain errors | Re-throws or wraps |
| Server Actions | All errors | Maps to `ApiResponse` via `createServerAction` |
| Route Handlers | All errors | Maps to JSON response with HTTP status |
| React `error.tsx` | Unhandled client errors | Renders friendly error UI |
| TanStack Query | Network/fetch errors | Exposed via `isError` + `error` in hooks |

---

## 3. Domain Error Codes

| Code | Description | HTTP |
|---|---|---|
| `BOOKING_CONFLICT` | Venue already booked for requested date/time | 409 |
| `BOOKING_INVALID_STATUS` | Invalid booking status transition | 400 |
| `VENUE_NOT_APPROVED` | Attempt to book an unapproved venue | 403 |
| `REVIEW_BOOKING_NOT_COMPLETED` | Review attempted before booking completed | 400 |
| `REVIEW_ALREADY_EXISTS` | Customer already reviewed this booking | 409 |
| `PAYMENT_CAPTURE_FAILED` | Payment gateway returned failure | 402 |
| `INSUFFICIENT_PERMISSIONS` | User role lacks required access | 403 |

---

## 4. Client Error Boundaries

Every route group has an `error.tsx`:

```typescript
// app/(customer)/error.tsx
"use client";

export default function CustomerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ textAlign: "center", padding: "4rem" }}>
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

---

## 5. Form Error Display

```
Field-level:  Show under each field (from Zod flatten())
Form-level:   Show above submit button (from ApiError.message)
Toast:        Shown for async mutations (success + error)
```

**Rule:** Never show raw DB error messages to users. Always use the `code` to look up a friendly message from a `ERROR_MESSAGES` map:

```typescript
// src/lib/error-messages.ts
export const ERROR_MESSAGES: Record<string, string> = {
  BOOKING_CONFLICT:      "This venue is already booked for that date and time. Please choose a different slot.",
  PAYMENT_CAPTURE_FAILED: "Your payment could not be processed. Please try again or use a different payment method.",
  INTERNAL_ERROR:        "Something went wrong on our end. Our team has been notified.",
  // ...
};
```

---

## 6. Logging

- **Server:** `console.error("[ClassName] message:", error)` — Vercel collects these
- **Client:** Never log sensitive data. Use error boundaries only.
- **Production:** Integrate Sentry via `@sentry/nextjs` for production error tracking
