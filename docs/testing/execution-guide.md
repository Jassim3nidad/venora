# Test Execution Guide

Run from repository root. Commands return nonzero on failure.

## Deterministic local layers

```bash
pnpm test:unit
pnpm test:component
pnpm test:integration
pnpm test:booking
pnpm test:payment
pnpm test:analytics
pnpm test:security
pnpm test:ai
pnpm test:database
pnpm docs:test:validate
pnpm test:secrets
```

`test:database` is static migration/RLS/type validation, not a live DB test.
Notification provider commands require dedicated non-production credentials:

```bash
pnpm test:notifications:db
pnpm test:notifications:providers
pnpm test:notifications:pipeline
```

## Browser and runtime layers

Run a non-production app/database with synthetic role fixtures and installed
Chromium:

```bash
pnpm test:rls
pnpm test:e2e:smoke
pnpm test:a11y
pnpm test:e2e
```

Use `APP_BASE_URL` only for localhost or approved QA. Playwright needs relevant
`E2E_*` values plus notification/Storage credentials. No browser command is
included in deterministic `validate:quality` because hidden external
dependencies would create false results.

## Performance

After `pnpm build`, run the built app locally and then:

```bash
pnpm test:performance
```

## Full deterministic validation

```bash
pnpm validate:quality
```

Formatting-only check:

```bash
pnpm exec prettier --check "package.json" "apps/web/**/*.{ts,tsx}" "scripts/*.mjs" "docs/**/*.md"
```

Blocked suite reports must include command, missing dependency/credential,
environment requirement, and static evidence obtained. Never relabel BLOCKED as
PASS.
