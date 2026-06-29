# Venora — Architecture Foundation
### AI-Powered Venue Discovery & Event Marketplace Platform

**Document type:** Engineering Foundation (Phase 0)  
**Audience:** Engineering team / interns  
**Status:** Living document — extended by per-module deep dives  
**Last updated:** 2026-06

---

## Table of Contents

0. [Purpose & How This Document Is Used](#0-purpose)
1. [System Architecture Overview](#1-system-architecture)
2. [Clean Architecture Mapping](#2-clean-architecture)
3. [Complete Unified Database Schema](#3-database-schema)
4. [RLS / RBAC Strategy](#4-rls-rbac)
5. [API, Validation, Error-Handling & Data-Fetching Conventions](#5-conventions)
6. [Module Roadmap](#6-module-roadmap)

---

## 0. Purpose & How This Document Is Used {#0-purpose}

This document is the **shared foundation** that every feature module (Auth, Venue Marketplace, Search, Calendar, Booking, Suppliers, Reviews, Analytics, AI, Admin, Payments) builds on top of. Designing 14 features in full isolation produces inconsistent schemas, duplicated conventions, and RLS holes — so we lock these once, here:

1. System architecture & layering
2. Feature-first folder structure
3. **Complete unified database schema** (all domains — they're relationally interdependent, so this has to be designed holistically)
4. RLS / RBAC strategy
5. API, validation, error-handling, and data-fetching conventions
6. The module roadmap — each subsequent module gets its own deep-dive doc following the 12-point spec (folder structure → DB extensions → API → UI pages → components → validation → error handling → loading states → empty states → security → responsive behavior → scalability).

**Rules for this document:**
- When a DB column name changes, change it here first, then in migrations, then in `packages/database/types/generated.ts`.
- When a new RLS policy is added, document it in Section 4 before merging.
- Do not add feature-specific logic to this doc — keep it at the conventions/contract layer.

---

## 1. System Architecture Overview {#1-system-architecture}

```
┌──────────────────────────────────────────────────────────────────┐
│                     CLIENT (Browser / Mobile Web)                 │
│  Next.js 15 App Router · React 19 · Tailwind · shadcn · Framer   │
└───────────────┬───────────────────────────────┬──────────────────┘
                │ Server Components / Actions    │ TanStack Query (client mutations)
                ▼                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│                    VERCEL EDGE / NEXT.JS SERVER                   │
│  Route Handlers (/app/api/*)  · Server Actions · Middleware       │
│  (auth guard · role guard · rate limiting · CSP headers)          │
└───────────────┬────────────────┬──────────────┬──────────────────┘
                │                │               │
                ▼                ▼               ▼
   ┌─────────────────┐  ┌───────────────┐  ┌──────────────────┐
   │  SUPABASE        │  │ SUPABASE EDGE │  │  EXTERNAL APIS   │
   │  Postgres + RLS  │  │ FUNCTIONS     │  │  OpenAI / Claude  │
   │  Auth (GoTrue)   │  │ ai-search     │  │  PayMongo / Maya  │
   │  Storage         │  │ ai-recommend  │  │  Google Maps      │
   │  Realtime        │  │ cost-estimator│  │  Resend (email)   │
   │  pg_cron         │  │ notifs        │  │  Vonage (SMS)     │
   └─────────────────┘  │ commission    │  └──────────────────┘
                         └───────────────┘
```

### Why this split

| Concern | Where it lives | Why |
|---|---|---|
| SEO-critical first paint | Server Components | No client-side spinner for venue listings/detail — critical for discovery product |
| Internal mutations | Server Actions | Colocated with calling component, fully typed, no separate API contract |
| External webhooks | Route Handlers (`/api/webhooks/*`) | Stable URLs for PayMongo/Maya, callable from future mobile app |
| AI / long-running tasks | Supabase Edge Functions | OpenAI keys never touch Vercel bundle; Supabase can trigger on DB events (e.g., recompute embeddings on venue update) |
| Auth token refresh | `middleware.ts` | Runs on every request edge-wide, keeps session cookie alive |

### Feature flags & env matrix

```
NEXT_PUBLIC_SUPABASE_URL          → Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY     → Public anon key (RLS-enforced)
SUPABASE_SERVICE_ROLE_KEY         → Webhook handlers only — never client-side
PAYMONGO_SECRET_KEY / _WEBHOOK_SECRET
MAYA_SECRET_KEY / _WEBHOOK_SECRET
OPENAI_API_KEY                    → Edge Functions env (not Next.js)
RESEND_API_KEY                    → Edge Functions env
NEXT_PUBLIC_APP_URL               → Canonical URL for OG / redirects
```

---

## 2. Clean Architecture Mapping {#2-clean-architecture}

Each feature module is sliced into four layers so business rules never depend on Next.js or Supabase directly (Dependency Inversion):

| Layer | Responsibility | Depends on |
|---|---|---|
| `domain/` | Entities, value objects, business rules | Nothing |
| `application/` | Use-cases / services that orchestrate domain rules | `domain/` |
| `infrastructure/` | Supabase queries, AI calls, payment gateway calls | `domain/`, external SDKs |
| `ui/` | React components, hooks, pages | `application/` via hooks |

```
src/features/<feature>/
├── domain/
│   ├── entities/          ← Pure TS classes with invariants
│   ├── value-objects/     ← Immutable types (BookingStatus, Price, etc.)
│   └── repositories/      ← Interfaces (contracts) — NO implementations here
├── application/
│   ├── use-cases/         ← Orchestrators: call repo interfaces + domain methods
│   └── services/          ← Cross-cutting app logic (notifications, calculations)
├── infrastructure/
│   └── supabase-*.repository.ts  ← Implements domain repository interfaces
├── ui/
│   ├── components/        ← Feature-specific React components
│   └── *.tsx              ← Page-level components
├── hooks/
│   ├── use-<feature>.ts   ← TanStack Query queries
│   └── use-create-<feature>.ts  ← TanStack Query mutations
├── schemas/
│   └── *.schema.ts        ← Zod — single source of truth for validation + types
└── types/
    └── *.types.ts          ← TypeScript types not derivable from Zod
```

**Dependency rule:** imports must always flow inward (ui → application → domain). Never import from `ui/` inside `domain/`, never import `supabase-js` inside `domain/` or `application/`.

---

## 3. Complete Unified Database Schema {#3-database-schema}

> All tables use `uuid` primary keys generated by `gen_random_uuid()` (PostgreSQL 14+). All tables have `created_at` and (where mutable) `updated_at` with auto-triggers.

### 3.1 Enums

```sql
-- User roles — controls RLS access tier
CREATE TYPE user_role AS ENUM ('customer', 'venue_owner', 'supplier', 'admin');

-- Venue lifecycle
CREATE TYPE venue_status AS ENUM ('draft', 'pending', 'approved', 'suspended');

-- Booking lifecycle — linear state machine
CREATE TYPE booking_status AS ENUM (
  'pending', 'confirmed', 'cancelled', 'completed', 'refunded'
);

-- Payment providers
CREATE TYPE payment_gateway AS ENUM ('paymongo', 'maya');

-- Supplier service categories
CREATE TYPE supplier_category AS ENUM (
  'catering', 'photography', 'av', 'decoration', 'entertainment', 'other'
);

-- Event types (used for AI cost estimation + search filtering)
CREATE TYPE event_type AS ENUM (
  'wedding', 'corporate', 'birthday', 'debut', 'graduation', 'other'
);
```

### 3.2 Core Tables

#### `profiles`
```sql
CREATE TABLE profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name     text,
  avatar_url    text,
  role          user_role NOT NULL DEFAULT 'customer',
  phone         text,
  is_verified   boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
```

**Trigger:** `handle_new_user()` — auto-inserts a `profiles` row on `auth.users` INSERT.

#### `venues`
```sql
CREATE TABLE venues (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            text NOT NULL,
  slug            text NOT NULL UNIQUE,
  description     text,
  address         text NOT NULL,
  city            text NOT NULL,
  region          text NOT NULL,
  lat             numeric(10,7),
  lng             numeric(10,7),
  capacity_min    int NOT NULL DEFAULT 1,
  capacity_max    int NOT NULL,
  base_price      numeric(12,2) NOT NULL,
  status          venue_status NOT NULL DEFAULT 'draft',
  cover_image_url text,
  images          text[] NOT NULL DEFAULT '{}',
  amenities       text[] NOT NULL DEFAULT '{}',
  event_types     event_type[] NOT NULL DEFAULT '{}',
  is_featured     boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT positive_capacity CHECK (capacity_max >= capacity_min AND capacity_min >= 1),
  CONSTRAINT positive_price    CHECK (base_price > 0)
);
CREATE INDEX venues_owner_idx    ON venues(owner_id);
CREATE INDEX venues_city_idx     ON venues(city);
CREATE INDEX venues_status_idx   ON venues(status);
CREATE INDEX venues_slug_idx     ON venues(slug);
```

#### `venue_availability_blocks`
Venue owners block dates/times (holidays, maintenance, private events):
```sql
CREATE TABLE venue_availability_blocks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id    uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  block_date  date NOT NULL,
  start_time  time NOT NULL,
  end_time    time NOT NULL,
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT  no_time_inversion CHECK (end_time > start_time)
);
CREATE INDEX avail_blocks_venue_date_idx ON venue_availability_blocks(venue_id, block_date);
```

#### `packages`
```sql
CREATE TABLE packages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id    uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  price       numeric(12,2) NOT NULL CHECK (price > 0),
  includes    text[] NOT NULL DEFAULT '{}',
  max_guests  int,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX packages_venue_idx ON packages(venue_id);
```

#### `bookings`
```sql
CREATE TABLE bookings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id            uuid NOT NULL REFERENCES venues(id),
  customer_id         uuid NOT NULL REFERENCES profiles(id),
  event_date          date NOT NULL,
  start_time          time NOT NULL,
  end_time            time NOT NULL,
  guest_count         int NOT NULL CHECK (guest_count >= 1),
  event_type          event_type NOT NULL DEFAULT 'other',
  status              booking_status NOT NULL DEFAULT 'pending',
  total_amount        numeric(12,2) NOT NULL CHECK (total_amount >= 0),
  commission_amount   numeric(12,2) NOT NULL DEFAULT 0 CHECK (commission_amount >= 0),
  payment_reference   text,
  payment_gateway     payment_gateway,
  payment_captured_at timestamptz,
  notes               text,
  cancellation_reason text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT no_time_inversion   CHECK (end_time > start_time),
  CONSTRAINT commission_lte_total CHECK (commission_amount <= total_amount)
);
CREATE INDEX bookings_venue_idx      ON bookings(venue_id);
CREATE INDEX bookings_customer_idx   ON bookings(customer_id);
CREATE INDEX bookings_event_date_idx ON bookings(event_date);
CREATE INDEX bookings_status_idx     ON bookings(status);
```

#### `booking_packages`
```sql
CREATE TABLE booking_packages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  package_id  uuid NOT NULL REFERENCES packages(id),
  price_at_booking numeric(12,2) NOT NULL, -- snapshot price at time of booking
  UNIQUE (booking_id, package_id)
);
```

#### `suppliers`
```sql
CREATE TABLE suppliers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_name   text NOT NULL,
  category        supplier_category NOT NULL,
  description     text,
  phone           text,
  website         text,
  logo_url        text,
  service_areas   text[] NOT NULL DEFAULT '{}',
  is_accredited   boolean NOT NULL DEFAULT false,
  accredited_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX suppliers_category_idx ON suppliers(category);
CREATE INDEX suppliers_owner_idx    ON suppliers(owner_id);
```

#### `booking_suppliers`
Venue owner attaches suppliers to a confirmed booking:
```sql
CREATE TABLE booking_suppliers (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (booking_id, supplier_id)
);
```

#### `reviews`
```sql
CREATE TABLE reviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id    uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  booking_id  uuid NOT NULL REFERENCES bookings(id) UNIQUE, -- 1 review per booking
  customer_id uuid NOT NULL REFERENCES profiles(id),
  rating      int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     text CHECK (char_length(comment) <= 1000),
  owner_reply text CHECK (char_length(owner_reply) <= 500),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reviews_venue_idx    ON reviews(venue_id);
CREATE INDEX reviews_customer_idx ON reviews(customer_id);
```

**Constraint:** enforced at application layer — `booking.status = 'completed'` and `booking.customer_id = auth.uid()` before insert.

#### `favourites`
```sql
CREATE TABLE favourites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  venue_id    uuid NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, venue_id)
);
CREATE INDEX favourites_customer_idx ON favourites(customer_id);
```

### 3.3 AI / Search

#### `venue_embeddings`
```sql
CREATE TABLE venue_embeddings (
  venue_id      uuid PRIMARY KEY REFERENCES venues(id) ON DELETE CASCADE,
  embedding     vector(1536),  -- OpenAI text-embedding-3-small
  content_hash  text NOT NULL, -- SHA-256 of concatenated text — skip re-embed if unchanged
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX venue_embeddings_hnsw_idx
  ON venue_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

#### `match_venues()` RPC
```sql
CREATE OR REPLACE FUNCTION match_venues(
  query_embedding  vector(1536),
  match_threshold  float    DEFAULT 0.75,
  match_count      int      DEFAULT 20,
  filter_city      text     DEFAULT NULL,
  filter_capacity  int      DEFAULT NULL,
  filter_max_price numeric  DEFAULT NULL
)
RETURNS TABLE (id uuid, name text, slug text, city text, base_price numeric, similarity float)
LANGUAGE sql STABLE AS $$
  SELECT v.id, v.name, v.slug, v.city, v.base_price,
         1 - (ve.embedding <=> query_embedding) AS similarity
  FROM   venue_embeddings ve
  JOIN   venues v ON v.id = ve.venue_id
  WHERE  v.status = 'approved'
    AND  (filter_city     IS NULL OR v.city = filter_city)
    AND  (filter_capacity IS NULL OR v.capacity_max >= filter_capacity)
    AND  (filter_max_price IS NULL OR v.base_price  <= filter_max_price)
    AND  1 - (ve.embedding <=> query_embedding) > match_threshold
  ORDER  BY ve.embedding <=> query_embedding
  LIMIT  match_count;
$$;
```

### 3.4 Analytics

#### `venue_analytics_daily` (Materialized View)
```sql
CREATE MATERIALIZED VIEW venue_analytics_daily AS
SELECT
  b.venue_id,
  date_trunc('day', b.event_date::timestamptz) AS period,
  count(*)                                      AS booking_count,
  sum(b.total_amount)                           AS revenue,
  sum(b.commission_amount)                      AS commission,
  avg(r.rating)                                 AS avg_rating
FROM   bookings b
LEFT   JOIN reviews r ON r.booking_id = b.id
WHERE  b.status IN ('confirmed', 'completed')
GROUP  BY 1, 2;

CREATE UNIQUE INDEX venue_analytics_daily_idx
  ON venue_analytics_daily(venue_id, period);
```

Refresh via `pg_cron`:
```sql
SELECT cron.schedule('refresh-analytics', '0 2 * * *',
  $$REFRESH MATERIALIZED VIEW CONCURRENTLY venue_analytics_daily$$);
```

---

## 4. RLS / RBAC Strategy {#4-rls-rbac}

### 4.1 Role Matrix

| Table | `anon` | `customer` | `venue_owner` | `supplier` | `admin` |
|---|---|---|---|---|---|
| `profiles` | read (public fields) | read any, update own | read any, update own | read any, update own | all |
| `venues` | read `approved` | read `approved` | CRUD own | read `approved` | all |
| `venue_availability_blocks` | — | read | CRUD own venue | — | all |
| `packages` | read (approved venue) | read | CRUD own venue | read | all |
| `bookings` | — | CRUD own | read own-venue bookings | — | all |
| `booking_packages` | — | CRUD own booking | read own-venue | — | all |
| `suppliers` | read `accredited` | read | read | CRUD own | all |
| `booking_suppliers` | — | read own | CRUD own-venue | read | all |
| `reviews` | read | insert own (completed booking), read | read + reply own | read | all |
| `favourites` | — | CRUD own | — | — | all |
| `venue_embeddings` | — | — | — | — | service_role only |
| `venue_analytics_daily` | — | — | read own-venue | — | all |

### 4.2 Helper Functions

```sql
-- Current user's role from profiles
CREATE OR REPLACE FUNCTION auth_role()
RETURNS user_role LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;

-- Current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT auth_role() = 'admin'
$$;

-- Current user owns the venue
CREATE OR REPLACE FUNCTION owns_venue(venue_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.venues
    WHERE id = venue_id AND owner_id = auth.uid()
  )
$$;

-- Booking belongs to a venue owned by current user
CREATE OR REPLACE FUNCTION owns_booking_venue(booking_id uuid)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN   public.venues v ON v.id = b.venue_id
    WHERE  b.id = booking_id AND v.owner_id = auth.uid()
  )
$$;
```

### 4.3 RLS Policy Summary

All policies follow the pattern: `ENABLE ROW LEVEL SECURITY` then `CREATE POLICY`.

**`venues` example:**
```sql
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;

-- Public: only approved venues
CREATE POLICY "venues.select.public"
  ON venues FOR SELECT
  USING (status = 'approved');

-- Owner: all their own venues (any status)
CREATE POLICY "venues.select.owner"
  ON venues FOR SELECT
  USING (owner_id = auth.uid());

-- Owner: insert
CREATE POLICY "venues.insert.owner"
  ON venues FOR INSERT
  WITH CHECK (owner_id = auth.uid() AND auth_role() = 'venue_owner');

-- Owner: update own
CREATE POLICY "venues.update.owner"
  ON venues FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Admin: everything
CREATE POLICY "venues.all.admin"
  ON venues FOR ALL
  USING (is_admin());
```

See `supabase/migrations/010_rls.sql` for full policies on all tables.

---

## 5. API, Validation, Error-Handling & Data-Fetching Conventions {#5-conventions}

### 5.1 API Response Envelope

All Route Handlers and Server Actions return a typed envelope:

```typescript
type ApiResponse<T> =
  | { data: T;    error: null }
  | { data: null; error: ApiError };

type ApiError = {
  code:    string;   // machine-readable, e.g. "BOOKING_CONFLICT"
  message: string;   // human-readable
  details?: unknown; // Zod field errors, etc.
};
```

### 5.2 Server Action Wrapper

```typescript
// src/lib/server-action.ts
import { VenoraError } from "./errors";
import type { ApiResponse } from "./types";
import { z } from "zod";

export async function createServerAction<TSchema extends z.ZodTypeAny, TResult>(
  schema: TSchema,
  handler: (input: z.infer<TSchema>) => Promise<TResult>,
  rawInput: unknown
): Promise<ApiResponse<TResult>> {
  const parsed = schema.safeParse(rawInput);
  if (!parsed.success) {
    return { data: null, error: { code: "VALIDATION_ERROR", message: "Invalid input", details: parsed.error.flatten() } };
  }
  try {
    const data = await handler(parsed.data);
    return { data, error: null };
  } catch (e) {
    if (e instanceof VenoraError) {
      return { data: null, error: { code: e.code, message: e.message } };
    }
    console.error("[ServerAction] Unexpected:", e);
    return { data: null, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } };
  }
}
```

### 5.3 Error Classes

```
VenoraError (base)
├── NotFoundError        → 404
├── ForbiddenError       → 403
├── UnauthorizedError    → 401
├── ValidationError      → 400 (+ field-level details)
├── ConflictError        → 409 (e.g., booking date conflict)
└── PaymentError         → 402
```

### 5.4 TanStack Query Key Factory

Centralised in `src/lib/query-keys.ts` to prevent key collision:

```typescript
export const queryKeys = {
  venues: {
    all:    ["venues"] as const,
    list:   (filters: object) => ["venues", "list", filters] as const,
    detail: (slug: string)    => ["venues", "detail", slug]  as const,
  },
  bookings: {
    all:      ["bookings"] as const,
    byCustomer: (id: string) => ["bookings", "customer", id] as const,
    byVenue:    (id: string) => ["bookings", "venue",    id] as const,
  },
  // ... one entry per feature
} as const;
```

### 5.5 Data Fetching Rules

| Scenario | Pattern | Why |
|---|---|---|
| SEO page (venue list/detail) | Server Component + direct Supabase server client | First-paint HTML, crawlable |
| Authenticated list (my bookings) | Server Component + direct Supabase server client | Server-side auth check, no flicker |
| Interactive / client-only (calendar, real-time) | `useQuery` + client Supabase | Needs reactivity |
| Mutation (create/update/delete) | Server Action wrapped in `useMutation` | Type-safe, colocated |
| Real-time updates (booking status) | `supabase.channel().on('postgres_changes')` | Supabase Realtime |

### 5.6 Loading & Empty States

Every feature must implement:
- **Loading:** `<Skeleton>` component (shimmer animation via `.skeleton` CSS class)
- **Empty:** Illustrated empty state with a CTA (never show a blank page)
- **Error:** `error.tsx` boundary at the route group level + inline error messages for forms

---

## 6. Module Roadmap {#6-module-roadmap}

Each module gets its own deep-dive doc in `docs/modules/<feature>.md` following this 12-point spec:

1. **Folder structure** — specific files within the Clean Architecture layers
2. **DB schema extensions** — any tables/columns beyond the foundation schema
3. **API surface** — Server Actions + Route Handlers with signatures
4. **UI pages** — route paths, access control, metadata
5. **Components** — component tree per page
6. **Validation** — all Zod schemas with field-level rules
7. **Error handling** — error codes + user-facing messages
8. **Loading states** — skeleton layouts per component
9. **Empty states** — illustration + CTA per scenario
10. **Security** — RLS double-check, auth guards, input sanitisation
11. **Responsive behaviour** — mobile breakpoints per layout
12. **Scalability** — caching strategy, pagination, indexes

### Module priority order (internship timeline)

| Priority | Module | Complexity | Dependencies |
|---|---|---|---|
| 1 | **Auth** | Low | None |
| 2 | **Venue Marketplace** | High | Auth |
| 3 | **Search** (keyword + AI) | Medium | Venues, AI |
| 4 | **Booking** | High | Venues, Auth |
| 5 | **Calendar** | Medium | Venues, Booking |
| 6 | **Payments** | High | Booking |
| 7 | **Reviews** | Low | Booking |
| 8 | **Suppliers** | Medium | Booking |
| 9 | **Analytics** | Medium | Booking, Reviews |
| 10 | **AI** | High | Search, Venues |
| 11 | **Admin** | Medium | All |

---

*For questions, create a GitHub Discussion or ping the #venora-eng Slack channel.*
