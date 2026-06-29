# Venora — Venue Booking Platform

A full-stack venue booking platform built with **Next.js 15**, **Supabase**, **TanStack Query**, **Zod**, and a **shadcn/ui** design system, organized as a **Turborepo** monorepo.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth |
| State / Fetching | TanStack Query v5 |
| Validation | Zod |
| UI Components | shadcn/ui + Radix UI |
| Styling | Tailwind CSS v4 |
| Monorepo | Turborepo + pnpm workspaces |
| Edge Functions | Supabase Edge Functions (Deno) |
| Payments | PayMongo + Maya |

## Monorepo Structure

```
venora/
├── apps/
│   └── web/          # Next.js 15 App Router application
├── packages/
│   ├── ui/           # Shared shadcn-based component library
│   ├── database/     # Supabase generated types + migrations
│   ├── lib/          # Shared utilities (format, slugify, cn)
│   └── config/       # Shared ESLint, TS, Tailwind configs
├── supabase/
│   ├── migrations/   # SQL migrations
│   ├── functions/    # Supabase Edge Functions
│   └── seed.sql
└── features/         # (also mirrored in apps/web/src/features)
```

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- Supabase CLI

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp apps/web/.env.example apps/web/.env.local
# Fill in your Supabase credentials in .env.local

# Start Supabase locally (optional)
supabase start

# Start the dev server
pnpm dev
```

### Environment Variables

See [`apps/web/.env.example`](./apps/web/.env.example) for required variables.

## Architecture

Features are organized using **Clean Architecture** principles:

```
features/<feature-name>/
├── domain/           # Entities, value objects, repository interfaces
├── application/      # Use cases, services
├── infrastructure/   # Supabase repository implementations
├── ui/               # React Server / Client components
├── hooks/            # TanStack Query hooks
├── schemas/          # Zod schemas (single source of truth)
└── types/            # TypeScript types
```

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start all apps in dev mode |
| `pnpm build` | Build all apps and packages |
| `pnpm lint` | Lint all packages |
| `pnpm type-check` | Type-check all packages |
| `pnpm db:types` | Regenerate Supabase TypeScript types |

## License

MIT
