# Venora

Venora is a Philippine venue discovery and event marketplace. Customers discover
venues and request bookings; venue owners manage venues and availability;
suppliers respond to eligible event inquiries; event-coordinator support is
partial; administrators moderate marketplace, payment, and reporting workflows.

The platform is actively implemented but still has documented product,
accessibility, integration, and runtime-verification gaps. Review
[known limitations](docs/known-limitations.md) before a production release.

## Stack

- Next.js 16 and React 19 in a pnpm/Turborepo workspace
- TypeScript, Tailwind CSS, Radix primitives, TanStack Query, Zod
- Supabase Auth, PostgreSQL, Row Level Security, Storage, and Edge Functions
- PayMongo, Resend, Web Push, OpenRouter/OpenAI, MapLibre/OpenFreeMap

## Repository

| Path        | Responsibility                                              |
| ----------- | ----------------------------------------------------------- |
| `apps/web/` | Next.js application, tests, Route Handlers, and features    |
| `packages/` | Shared UI, database types, utilities, and configuration     |
| `supabase/` | SQL migrations, seed data, local config, and Edge Functions |
| `scripts/`  | Validation and safe SQL-printing utilities                  |
| `docs/`     | API, design, engineering, and operational documentation     |

See [repository structure](docs/repository-structure.md) for ownership rules.

## Quick start

Prerequisites: Node.js 20 or newer, pnpm 9 (9.15.0 is pinned), and Git.
Supabase CLI plus Docker are needed only for a full local Supabase stack.

```bash
pnpm install --frozen-lockfile
cp .env.example apps/web/.env.local
pnpm dev
```

On PowerShell, copy the environment file with:

```powershell
Copy-Item .env.example apps/web/.env.local
```

Replace placeholders with credentials for the intended environment. Never
commit `.env.local`. The web app is served at `http://localhost:3000` by
default. For migrations, seed data, Storage, Edge Functions, and provider setup,
follow [Getting started](docs/getting-started.md).

## Validate

```bash
pnpm lint
pnpm type-check
pnpm test
pnpm build
pnpm docs:all:validate
```

The current verified baseline is recorded in [Testing](docs/testing.md); counts
are evidence for that commit, not a permanent guarantee.

## Documentation

- [Documentation index](docs/README.md)
- [Architecture](docs/architecture.md)
- [Environment variables](docs/environment-variables.md)
- [Database and migrations](docs/database.md)
- [Deployment](docs/deployment.md)
- [Runbooks](docs/runbooks/README.md)
- [API and OpenAPI](docs/api/README.md)
- [UI/UX design inventory](docs/design/README.md)
- [Contributing](CONTRIBUTING.md)
- [Security reporting](SECURITY.md)

No license file is present. Do not assume rights beyond those granted by the
repository owner.
