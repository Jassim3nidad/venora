# Venora — Venue Discovery & Event Marketplace Platform

Venora is an enterprise-grade venue discovery and booking SaaS platform for the Philippine market: customers browse and book venues, venue owners and suppliers manage listings and bookings, and a tiered admin platform handles moderation, commissions, and reporting. Built as a Turborepo/pnpm monorepo around **Next.js 16** (App Router, Turbopack) and **Supabase**.

---

## Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| **Frontend** | Next.js 16 (App Router) & React 19 | Server Components, Server Actions, Turbopack for both dev and build |
| **Language** | TypeScript | Strict-ish; a handful of pre-existing `any` usages remain, tracked as lint warnings |
| **Backend & Database** | Supabase & PostgreSQL | Row-Level Security on every table, `SECURITY DEFINER` helper functions, Postgres triggers |
| **Auth** | Supabase Auth | Role-based (`user_roles`) plus a separate fine-grained admin permission system (`admin_user_roles` / `admin_role_permissions`) for tiered admin accounts |
| **State Management** | TanStack Query v5 | Client-side caching/fetching |
| **Forms** | React Hook Form & Zod | Schema-driven validation |
| **Maps** | MapLibre GL JS | Style: OpenFreeMap "Liberty" (`tiles.openfreemap.org`); geocoding via OSM Nominatim. Both map components are lazy-loaded via `next/dynamic`. |
| **AI** | OpenRouter (default model `tencent/hy3:free`) | 6 Supabase Edge Functions; runtime config lives in the `ai_configurations` table, usage logged (no raw prompts/responses) to `ai_usage_logs` |
| **Payments** | PayMongo | The only actively wired gateway. Maya has webhook signature verification but no registered gateway implementation — present as an inactive stub, not production-ready. |
| **Styling** | Tailwind CSS v4 & Radix Primitives | Custom design tokens in `globals.css`, light/dark theme support |
| **Monorepo** | Turborepo & pnpm workspaces | `pnpm@9.15.0`, Node `>=20` |
| **Compute** | Deno Edge Functions | AI features + booking notifications |
| **Deployment** | Vercel | Auto-deploys from `main` via GitHub integration |

---

## Repository Structure

```
venora/
├── apps/
│   └── web/                      # Next.js 16 App Router application
│       ├── app/                  # Routes, grouped by area: (customer), (admin), (venue-owner),
│       │                         # (supplier), (event-coordinator), (marketing), (auth)
│       │   ├── robots.ts         # Crawl rules (disallows private routes)
│       │   └── sitemap.ts        # DB-backed sitemap (published venues/suppliers + static routes)
│       ├── proxy.ts               # Session refresh + role-based route guard (Next 16's
│       │                         # middleware.ts replacement)
│       ├── src/
│       │   ├── components/       # Shared UI: dashboard shell, layout, admin widgets
│       │   ├── features/         # Feature-first modules (auth, booking, venues, suppliers,
│       │   │                     # payments, reviews, admin-*, ai, notifications, calendar...)
│       │   │   └── <feature>/
│       │   │       ├── application/   # Server Actions, queries, use-cases
│       │   │       ├── domain/        # Entities/value objects (where the feature warrants it —
│       │   │       │                 # e.g. payments; not every feature has this layer)
│       │   │       ├── schemas/       # Zod validation schemas
│       │   │       ├── ui/            # Feature-scoped React components
│       │   │       └── hooks/         # TanStack Query hooks
│       │   └── lib/               # RBAC guards, Supabase client factories, shared utilities
│       └── e2e/                   # Playwright specs (per-role auth/permission coverage,
│                                   # accessibility, notifications, storage uploads)
├── packages/
│   ├── ui/                       # Shared component library (@venora/ui)
│   ├── database/                 # Supabase-generated TypeScript types
│   ├── lib/                      # Shared helpers (slugify, cn, error classes)
│   └── config/                   # Shared ESLint/TypeScript/Tailwind presets
└── supabase/
    ├── migrations/                # 65 ordered SQL migrations (001 → 065)
    ├── functions/                 # Deno Edge Functions:
    │                              #   _shared, ai-assistant, ai-cost-estimator,
    │                              #   ai-package-comparison, ai-recommendation, ai-search,
    │                              #   ai-venue-description, booking-notifications
    └── seed.sql
```

---

## Getting Started

### Prerequisites
- **Node.js** `>= 20`
- **pnpm** `>= 9` (`pnpm@9.15.0` pinned via `packageManager`)
- A Supabase project (this app targets a **hosted** Supabase project — Docker/local Supabase is only needed if you want `supabase db reset`/local type generation; the app itself runs fine against a hosted instance without Docker)

### Install & configure
```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local
```

At minimum, `apps/web/.env.local` needs:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> `NEXT_PUBLIC_APP_URL` feeds `metadataBase`, canonical URLs, the sitemap, and JSON-LD structured data (`src/lib/site-url.ts`) — set it to the real deployed origin in every environment, including Preview. A stale value here silently breaks Open Graph previews and canonical URLs without throwing any error.

For AI features, payments, and push notifications, see `apps/web/.env.example` and `supabase/.env.example` for the full variable list (`OPENROUTER_API_KEY`, `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`, `VAPID_*`, etc.) — all are server-only and must never be exposed to the client.

### Run
```bash
pnpm dev
```
- Web app: **http://localhost:3000**
- Design system showcase: **http://localhost:3000/design-system**

---

## Architecture Notes

### RLS and authorization
Every table has Row-Level Security enabled. Two layers of role checking exist:
- **Coarse roles** (`user_roles`: customer, venue_owner, supplier, event_coordinator, admin) — enforced via `requireRole()`/`hasRole()` (`src/lib/rbac/guards.ts`) and mirrored in `proxy.ts`'s route guard.
- **Fine-grained admin permissions** (`admin_user_roles` tier + `admin_role_permissions`) — enforced via `requirePermission()` (`src/lib/rbac/admin-context.ts`), backed by the `has_admin_permission()` SQL function. Use this for anything gated to a specific admin tier (e.g. finance-only commission overrides) rather than "any admin."

`SECURITY DEFINER` functions on this project require explicit `REVOKE ... FROM PUBLIC, anon, authenticated` — this project's default privileges grant execute directly to those roles, so a `PUBLIC`-only revoke is not sufficient (see migration `047_explicit_role_revoke.sql` and `065_lock_down_internal_only_functions.sql`).

### Maps
`VenueMap` and `VenueLocationPicker` (both lazy-loaded via `next/dynamic`) render an OpenFreeMap "Liberty" style through MapLibre GL. Geocoding uses the free public OSM Nominatim endpoint. Venue coordinates are validated against a Philippines bounding box, with city/province centroid fallbacks when a venue has no precise coordinates.

### AI
All AI features go through OpenRouter via Supabase Edge Functions (`supabase/functions/_shared/openrouter.ts` and `ai-config.ts`), with per-feature runtime configuration (model, temperature, token/rate/spend limits, moderation) stored in `ai_configurations` and editable by admins. The default model is `tencent/hy3:free`. Usage is logged to `ai_usage_logs` (token counts and cost only — never raw prompts or responses).

### Payments
PayMongo is the only active gateway (`src/features/payments/infrastructure/paymongo/`), with webhook signature verification, idempotent event processing, commission snapshots taken at confirmation time, and a full refund flow. Maya has webhook signature-verification code but no registered `PaymentGateway` implementation — treat it as scaffolding, not a working integration.

---

## Testing

```bash
pnpm test          # Vitest unit/integration tests (apps/web)
pnpm type-check     # tsc --noEmit
pnpm lint           # ESLint
```

End-to-end coverage lives in `apps/web/e2e/` (Playwright): per-role auth/permission boundary tests (customer, venue owner, supplier, analyst admin, finance admin, super admin), cross-tenant isolation, admin accessibility (`@axe-core/playwright`), notifications, and storage uploads. These require dedicated QA fixture credentials (`E2E_<ROLE>_EMAIL`/`E2E_<ROLE>_PASSWORD` in `.env.local`, gitignored) — never run against real user accounts. Run with:

```bash
pnpm --filter @venora/web exec playwright test
```

---

## SEO

Public marketing and marketplace pages render statically where possible (auth-dependent navbar state is fetched client-side rather than forcing every page dynamic). `app/robots.ts` and `app/sitemap.ts` are generated routes — the sitemap includes published venues and accredited suppliers pulled live from the database. Venue and supplier detail pages emit JSON-LD (`EventVenue`/`LocalBusiness` schema.org types) and per-listing Open Graph images.

---

## Standard Development Commands

| Command | Action |
|---|---|
| `pnpm dev` | Next.js dev server (Turbopack) |
| `pnpm build` | Production build across all workspaces |
| `pnpm type-check` | TypeScript compiler check, no emit |
| `pnpm lint` | ESLint across all workspaces |
| `pnpm test` | Vitest unit/integration tests |
| `pnpm --filter @venora/web run analyze` | Production build with the bundle analyzer enabled (webpack-only — has no effect under Turbopack builds; inspect `.next/static/chunks` directly for real chunk sizes in the meantime) |
| `supabase migration list --linked` | Compare local migrations against the linked remote project |
| `supabase db push --dry-run` | Preview pending migrations without applying them |

---

## Deployment

Production deploys automatically from `main` via Vercel's GitHub integration. Before deploying to a new environment:

**Email** — verify the Resend sending domain; set `RESEND_API_KEY` and a verified `RESEND_FROM`.

**Web push** — generate VAPID keys; set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.

**Environment variables** — double-check `NEXT_PUBLIC_APP_URL` is set correctly per environment (Production and Preview separately); a value copied from local dev will silently break canonical URLs and social-share previews without any build or runtime error.

**Database migrations** — this project has no CI-driven migration pipeline; new migrations in `supabase/migrations/` must be applied manually via the Supabase Dashboard SQL editor (or `supabase db push` with a valid `SUPABASE_ACCESS_TOKEN`) and are additive-only — never edit an already-applied migration file.
