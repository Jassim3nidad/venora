# System Architecture

This guide describes the implemented repository. Live provider dashboards,
deployed Supabase grants/function settings, and Vercel/GitHub integration were
not queried, so deployment claims are conditional.

## Deployment view

```mermaid
flowchart LR
  Browser["Browser"] --> Vercel["Vercel / Next.js"]
  Vercel --> Auth["Supabase Auth"]
  Vercel --> DB["PostgreSQL + RLS"]
  Vercel --> Storage["Supabase Storage"]
  Vercel --> PayMongo["PayMongo"]
  PayMongo --> Webhook["Next.js webhook handler"]
  Webhook --> DB
  Browser --> Edge["Supabase Edge Functions"]
  Edge --> DB
  Edge --> Resend["Resend"]
  Edge --> Push["Web Push endpoints"]
  Edge --> AI["OpenRouter: qwen/qwen3.7-flash"]
  Browser --> Maps["OpenFreeMap / Nominatim"]
  GitHub["GitHub repository"] -. "external integration" .-> Vercel
```

The browser is untrusted. Next.js server code and Edge Functions are trusted
application boundaries; service-role access is privileged. PostgreSQL RLS and
Storage policies are the final data authorization boundaries. External
providers receive only task-required data and may fail independently.

## Request lifecycle

```mermaid
sequenceDiagram
  participant B as Browser
  participant N as Next.js
  participant S as Supabase SSR client
  participant P as PostgreSQL/RLS
  B->>N: Page, Server Action, or Route Handler request
  N->>S: Resolve cookies/session
  S->>P: Query with user JWT or privileged server key
  P-->>S: Authorized rows or RLS error
  S-->>N: Typed result
  N-->>B: HTML/stream/redirect/JSON
```

Server Components fetch on the server and pass serializable data to Client
Components. Client Components own interaction state and browser APIs. Server
Actions validate input, resolve the current user, authorize, mutate through
Supabase, and revalidate/redirect. Route Handlers implement HTTP/webhook/export
surfaces. Response envelopes are currently mixed.

## Authentication lifecycle

```mermaid
sequenceDiagram
  participant U as User
  participant W as Next.js UI
  participant A as Supabase Auth
  participant C as /auth/callback
  participant D as Profiles and roles
  U->>W: Register/login/reset request
  W->>A: Auth API call
  A-->>U: Verification or recovery email
  U->>C: Token/code callback
  C->>A: Exchange code for session
  C->>D: Resolve profile, role, approval
  C-->>U: Role-aware redirect or failure
```

`apps/web/proxy.ts` refreshes sessions and guards route groups. Server Actions
and Route Handlers must repeat server authorization; UI visibility is not a
control. RLS applies independently.

## Booking lifecycle

```mermaid
stateDiagram-v2
  [*] --> pending: customer submits inquiry
  pending --> approved: venue approves
  pending --> declined: venue declines
  pending --> cancelled: customer cancels
  approved --> payment_pending: checkout starts
  approved --> cancelled: cancellation
  approved --> expired: payment deadline
  payment_pending --> confirmed: reconciled paid webhook
  payment_pending --> approved: checkout/payment failure recovery
  payment_pending --> expired: payment deadline
  confirmed --> completed: event completed
  confirmed --> cancelled: approved cancellation/refund path
  completed --> reviewed: eligible review submitted
```

Database functions/triggers guard ownership, capacity, availability, duplicate
active dates, allowed transitions, and reconciliation. Snapshot columns preserve
booking/package/event and supplier inquiry context.

## Payment lifecycle

```mermaid
sequenceDiagram
  participant U as Customer
  participant N as Next.js
  participant G as PayMongo
  participant H as Webhook handler
  participant D as PostgreSQL
  U->>N: Start checkout for approved booking
  N->>D: Claim/create payment attempt
  N->>G: Create checkout with metadata and return URLs
  G-->>U: Hosted checkout
  G->>H: Signed paid event
  H->>H: Verify signature and claim event
  H->>D: Reconcile amount/currency/reference
  D->>D: Confirm booking, documents, commission, audit
  H-->>G: Idempotent response
```

PayMongo is active. Maya has been retired and Stripe is not registered.
Webhooks can be duplicated, delayed, or reordered, so
claiming, reconciliation, and idempotent database operations are mandatory.

## Notification lifecycle

```mermaid
flowchart LR
  Event["Booking/payment/review/admin event"] --> DB["Create notification + delivery records"]
  DB --> Inbox["In-app inbox"]
  DB --> Email["Resend email"]
  DB --> Push["Web Push with VAPID"]
  Email --> Status["Delivery status / retry evidence"]
  Push --> Status
  Prefs["User preferences"] --> DB
```

In-app notification creation is transactional where invoked by database
helpers. Email and push are external and can fail after database success;
delivery records support inspection/retry. SMS is disabled.

## Storage upload lifecycle

```mermaid
sequenceDiagram
  participant B as Browser
  participant N as Next.js action/handler
  participant D as PostgreSQL authorization
  participant S as Supabase Storage
  B->>N: File metadata and requested purpose
  N->>D: Authenticate role/owner/admin permission
  N->>S: Signed upload or scoped upload request
  S-->>B: Upload authorization/result
  B->>S: Upload bytes
  S->>S: Bucket policy, path, MIME, size checks
  S-->>B: Public path or private object reference
```

Four buckets have distinct visibility and limits. Current validation relies on
metadata/MIME/extension rather than magic-byte inspection. Private verification
documents require signed access.

## Supplier inquiry lifecycle

```mermaid
flowchart LR
  Booking["Eligible approved/confirmed booking"] --> Snapshot["Supplier-visible event snapshot"]
  Snapshot --> Browse["Supplier marketplace"]
  Browse --> Quote["Quote / message / favorite"]
  Quote --> Customer["Customer inquiry tracking"]
  Customer --> Audit["Status, messages, notifications"]
```

Supplier eligibility and snapshot functions reduce direct exposure of customer
booking data. Cross-tenant behavior still requires authenticated runtime RLS
testing; fallback supplier data can resemble actionable inventory.

## Analytics lifecycle

```mermaid
flowchart LR
  Bookings["Authorized booking/payment rows"] --> RPC["Analytics queries/RPCs"]
  Venues["Venue/package data"] --> RPC
  RPC --> Dashboard["Owner/admin dashboards"]
  RPC --> CSV["CSV export handler"]
  RPC --> PDF["PDF export handler"]
  Audit["Role/permission + RLS"] --> RPC
```

Analytics are database-derived; there is no external analytics provider key.
Exports must preserve tenant/permission scope and avoid caching another user's
data. Authenticated export paths remain runtime-unverified without fixtures.

## AI request lifecycle

```mermaid
sequenceDiagram
  participant U as Authenticated user
  participant E as Supabase Edge Function
  participant D as PostgreSQL
  participant P as OpenRouter (qwen/qwen3.7-flash)
  U->>E: Feature input + JWT
  E->>D: Load ai_configurations and usage limits
  E->>E: Validate, moderate, redact/minimize
  E->>P: Prompt and required context
  P-->>E: Model response or error/timeout
  E->>D: Log tokens/cost/status, not raw prompt/response
  E-->>U: Validated output or deterministic error/fallback
```

OpenRouter is the only supported provider and `qwen/qwen3.7-flash` is the required
model. Alternate provider/model fallbacks are rejected. Limits and feature
settings are database-configured. External model calls require prompt-injection
defenses, data minimization, timeouts, cost limits, and safe failure behavior.

## Services and operational properties

| Service                   | Responsibility / auth / data                                    | Failure, retry, idempotency, risk                                                                                   |
| ------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Next.js/Vercel            | UI, SSR, actions, handlers; cookies/JWT; user and business data | Requests may fail/build may drift; mutations must be idempotent; protect server secrets and confirm deployed commit |
| Supabase Auth             | Identity/session/email tokens                                   | Expired/misconfigured redirects fail; retry user flows safely; avoid account enumeration                            |
| PostgreSQL/RLS            | Durable state and final row authorization                       | Transactions roll back; retries must respect unique/idempotency guards; security-definer grants need review         |
| Edge Functions            | AI and booking-notification compute; JWT/service secrets        | External timeout/error; retry only idempotent work; deployed JWT config is externally verified                      |
| Storage                   | Public/private objects with policies                            | Signed URLs expire; retry uploads carefully; path/policy and MIME spoofing are risks                                |
| PayMongo                  | Hosted checkout, webhook events                                 | Duplicate/late events expected; signature, event claim, and reconciliation required                                 |
| Resend/Web Push           | Outbound delivery                                               | At-least-once/failed delivery possible; use delivery records and user preferences; never log credentials            |
| Map providers             | Tiles and geocoding for public venue data                       | Network/rate-policy failure; graceful map/search fallback; no Google Maps integration                               |
| OpenRouter                | Generated output and search intent using `qwen/qwen3.7-flash`   | Timeout, rate limit, unsafe output; bound context, validate output, log metadata only                               |
| GitHub/Vercel integration | Source and deployment orchestration                             | Configuration is outside repository and unverified; no repo workflow/vercel config exists                           |

Logging uses application/provider logs, database audit rows, payment event
records, notification delivery records, and AI usage metadata. No centralized
tracing/SLO stack is documented. Avoid logging secrets, raw verification files,
payment credentials, or unnecessary AI content.
