# Getting Started

## Supported setup

Development is supported on current Windows, macOS, and Linux versions that can
run Node.js 20+, pnpm 9, Git, and—when using local Supabase—Docker. The repository
pins pnpm 9.15.0. A hosted Supabase project can serve the app without Docker,
but local resets, migration rehearsal, and local type generation require the
Supabase CLI and Docker.

## Setup sequence

1. Clone the repository and enter its root.
2. Install the pinned dependencies.
3. Copy `.env.example` to `apps/web/.env.local`; replace placeholders with
   credentials for a dedicated local or test environment.
4. Choose hosted Supabase or start the local stack.
5. Apply/rehearse migrations and seed only in the intended non-production
   environment.
6. Configure optional integrations, then start the app.

```bash
git clone <repository-url> venora
cd venora
pnpm install --frozen-lockfile
cp .env.example apps/web/.env.local
pnpm dev
```

PowerShell equivalent for the copy step:

```powershell
Copy-Item .env.example apps/web/.env.local
```

Expected: pnpm installs from `pnpm-lock.yaml`, then the web app becomes available
at `http://localhost:3000`. Common failures are an unsupported Node version,
Corepack/pnpm not installed, a lockfile mismatch, occupied port, or missing
Supabase public variables.

## Supabase and database

The repository contains `supabase/config.toml`, 71 SQL migration files, and a
local seed with four non-password fixture identities and 11 venues. For a local
stack, run from the repository root:

```bash
supabase start
supabase db reset --local
pnpm db:types
```

`supabase start` is local and non-production but requires Docker. `supabase db
reset --local` destroys and recreates the **local** database, applies migrations,
then runs `supabase/seed.sql`; never remove `--local` or use it against a hosted
project. `pnpm db:types` overwrites the generated database type file from the
local schema, so run it only after all migrations apply successfully. Duplicate
migration versions `0680`/`071` have known history risks; read [Migrations](migrations.md)
before resetting or pushing.

To compare a deliberately linked hosted project without applying SQL:

```bash
supabase migration list --linked
supabase db push --dry-run --linked
```

These commands require a confirmed project link and Supabase access. The second
is a preview, not an application. Review the project identifier and SQL before
any privileged push. Production changes need explicit approval.

Migrations create the documented Storage buckets and policies. Verify the four
buckets after setup; do not create less restrictive dashboard policies as a
shortcut. See [Database](database.md), [Migrations](migrations.md), and
[Storage](storage.md).

## Authentication and providers

- **Supabase Auth:** configure the site URL and allow
  `http://localhost:3000/auth/callback`; enable the desired email provider.
- **PayMongo:** use test-mode secret and webhook credentials. Point the test
  webhook at `/api/webhooks/paymongo`; never use live keys locally.
- **Resend:** use a test key and a sender/domain permitted by the account.
- **Web Push:** generate a VAPID key pair; private key and subject stay
  server-only.
- **Maps:** no Google Maps setup exists. MapLibre/OpenFreeMap and OSM Nominatim
  are used without a repository-defined Google key.
- **AI:** set `OPENROUTER_API_KEY` for server-side generation. The runtime is
  locked to `tencent/hy3:free`; alternate providers and models are rejected.

For Edge Functions, copy safe values from `supabase/.env.example` to an ignored
local file and serve/deploy using Supabase CLI only for a confirmed project.
Hosted secrets are set with `supabase secrets set`; this is privileged and is
not part of routine local startup. Per-function deployed JWT settings are not
repository-verified.

No separate application background worker is required. Local Supabase services
are the only optional long-running dependency.

## Command reference

Run all commands from the repository root unless stated otherwise.

| Command                                          | Purpose and prerequisites                                         | Safety and expected result                                            | Common failure                                |
| ------------------------------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------- |
| `pnpm dev`                                       | Start workspace development servers after install/env setup       | Local, non-destructive; web listens on port 3000                      | Port conflict or missing env                  |
| `pnpm lint`                                      | Run workspace ESLint                                              | Read-only; zero errors expected, warnings may remain                  | ESLint violation or config/version drift      |
| `pnpm type-check`                                | Run TypeScript without emit                                       | Read-only; exits zero                                                 | Stale DB types or invalid imports             |
| `pnpm test`                                      | Run Vitest suite                                                  | Test-only; uses mocks unless a test says otherwise                    | Dependency/test regression                    |
| `pnpm build`                                     | Run production webpack build                                      | Writes ignored build output; exits zero                               | Missing build env, type, or route error       |
| `pnpm docs:all:validate`                         | Validate API, design, technical docs, links, tables, and runbooks | Read-only except deterministic OpenAPI generation when run separately | Stale inventory or broken link                |
| `pnpm --filter @venora/web exec playwright test` | Run browser E2E with dedicated fixtures                           | Never point at real users/production                                  | Missing browser or `E2E_*` fixtures           |
| `supabase stop`                                  | Stop the local stack                                              | Local and safe; preserves local volumes by default                    | Docker/CLI unavailable                        |
| `supabase db reset --local`                      | Rebuild local DB and seed                                         | **Destructive to local DB only**                                      | Docker, migration, or duplicate-version issue |

## First-run troubleshooting

If setup fails, confirm `node --version`, `pnpm --version`, Docker state,
environment file location, Supabase URL/key pairing, and port 3000. Do not bypass
RLS, expose the service-role key, edit generated types, or apply SQL to
production to make local setup pass. Continue with [Troubleshooting](troubleshooting.md).
