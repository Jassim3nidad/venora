# Unit and Component Tests

## Current coverage

Vitest configuration is `apps/web/vitest.config.ts`; it runs Node-based
`*.test.ts` and `*.test.tsx` files. Main coverage includes booking/calendar
rules, PayMongo parsing/signatures, checkout URLs, money, commissions, supplier
eligibility, analytics export safety, RBAC, debug-route behavior, file magic
bytes, venue counts, and table semantics.

```bash
pnpm test:unit
pnpm test:component
```

## Added risk tests

- `apps/web/src/lib/security/debug-route.test.ts`: `/api/debug` returns empty
  404 and exposes no data/error detail.
- `apps/web/src/lib/security/file-signatures.test.ts`: PDF/JPEG/PNG magic bytes,
  mismatch, HTML disguise, unsupported type, truncation.
- `apps/web/src/features/venues/utils/venue-pagination.test.ts`: remaining venue
  count never negative.
- `apps/web/src/components/dashboard/enterprise/ui.component.test.ts`: table
  empty state, named scroll region, table/header semantics.

## Gaps

No jsdom/Testing Library interaction harness exists. Auth forms, drawers,
dialogs, crop UI, favorite controls, upload controls, charts, focus movement,
and client error/loading behavior need browser/component interaction coverage.
Adding a large framework was outside this focused task; Playwright remains the
current interaction layer.
