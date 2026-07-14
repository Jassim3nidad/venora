# Venora Documentation

This index separates current, code-backed guidance from historical planning.
Start with [Getting started](getting-started.md), then use the focused guide for
the system you are changing.

## Engineering

- [Getting started](getting-started.md)
- [Environment variables](environment-variables.md)
- [Repository structure](repository-structure.md)
- [System architecture](architecture.md)
- [Authentication](authentication.md) and [authorization](authorization.md)
- [Database](database.md), [migrations](migrations.md), and [Storage](storage.md)
- [Bookings](bookings.md), [payments](payments.md), and
  [notifications](notifications.md)
- [Analytics](analytics.md) and [AI](ai.md)
- [Testing](testing.md), [deployment](deployment.md), and
  [troubleshooting](troubleshooting.md)
- [Known limitations](known-limitations.md)
- [Operational runbooks](runbooks/README.md)
- [Documentation inventory](documentation-inventory.md)

## Contract and product references

- [API documentation](api/README.md) and [OpenAPI 3.1](api/openapi.json)
- [UI/UX documentation](design/README.md)
- [API conventions](conventions/api-conventions.md)
- [Error conventions](conventions/error-handling.md)

The code-backed `docs/api/` and `docs/design/` suites remain authoritative for
their inventories. `api-contracts.md`, `modules/`, and `deployment/vercel.md`
are compatibility locations that now point to canonical guides. Historical QA,
bug, feature, and planning documents are retained as snapshots; they must not be
used as current operational truth without revalidation.

## Maintaining documentation

Run `pnpm docs:all:validate` from the repository root. Update API docs for
contract changes, design docs for route/flow changes, and technical docs for
architecture or operational changes. Never place real credentials, personal
data, production URLs, or machine-local absolute paths in documentation.
