# API Conventions — Venora

> See also: [error-handling.md](./error-handling.md) · [data-fetching.md](./data-fetching.md)

---

## 1. Response Envelope

All Route Handlers and Server Actions return a **typed discriminated union**:

```typescript
// src/lib/types.ts
export type ApiResponse<T> =
  | { data: T;    error: null }
  | { data: null; error: ApiError };

export type ApiError = {
  code:     string;   // machine-readable, e.g. "BOOKING_CONFLICT"
  message:  string;   // human-readable, shown to user
  details?: unknown;  // Zod field errors, DB constraint details, etc.
  status?:  number;   // HTTP status code (only on Route Handlers)
};
```

**Never return raw Supabase error objects** to the client. Always map to `ApiError`.

---

## 2. Route Handler Structure

```
app/api/
└── webhooks/
    ├── paymongo/route.ts    ← POST only (external webhook)
    └── maya/route.ts        ← POST only (external webhook)
```

### Template

```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { VenoraError } from "@/src/lib/errors";

const schema = z.object({ ... });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten() } },
        { status: 400 }
      );
    }

    const data = await yourUseCase(parsed.data);
    return NextResponse.json({ data, error: null }, { status: 200 });

  } catch (e) {
    if (e instanceof VenoraError) {
      return NextResponse.json(
        { data: null, error: { code: e.code, message: e.message } },
        { status: e.httpStatus }
      );
    }
    console.error("[API] Unexpected:", e);
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
      { status: 500 }
    );
  }
}
```

---

## 3. Server Actions

Prefer Server Actions over Route Handlers for **internal mutations** (same Next.js app, no external callers):

```typescript
// src/features/booking/application/actions/create-booking.action.ts
"use server";

import { createServerAction } from "@/src/lib/server-action";
import { createBookingSchema } from "../schemas/booking.schema";
import { CreateBookingUseCase } from "../use-cases/create-booking.usecase";

export async function createBookingAction(rawInput: unknown) {
  return createServerAction(
    createBookingSchema,
    async (input) => {
      // ... execute use case
    },
    rawInput
  );
}
```

**Convention:** Server Actions live in `features/<feature>/application/actions/`. One action per use case.

---

## 4. HTTP Status Code Map

| Scenario | Status |
|---|---|
| Success | 200 |
| Created | 201 |
| Validation error | 400 |
| Unauthorized (no session) | 401 |
| Forbidden (wrong role) | 403 |
| Not found | 404 |
| Conflict (e.g., booking overlap) | 409 |
| Payment required / failed | 402 |
| Rate limited | 429 |
| Server error | 500 |

---

## 5. Webhook Handlers

All webhook handlers MUST:
1. **Verify the signature** before processing (HMAC-SHA256 for PayMongo, HMAC-SHA512 for Maya)
2. Return `200 { received: true }` immediately, process async
3. Use `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS) only inside webhook handlers
4. Be idempotent — handle duplicate webhook delivery gracefully

```typescript
// Pattern
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!verifySignature(rawBody, request.headers)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  // Process event — fire and forget is acceptable here
  void handleEvent(JSON.parse(rawBody));
  return NextResponse.json({ received: true });
}
```

---

## 6. Rate Limiting

Apply at middleware level for all `/api/` routes. Use Upstash Redis + `@upstash/ratelimit`:

```typescript
// middleware.ts
import { Ratelimit } from "@upstash/ratelimit";
// 30 requests per 60 seconds per IP
const ratelimit = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "60 s") });
```

Webhooks are exempted from rate limiting (authenticated by signature).
