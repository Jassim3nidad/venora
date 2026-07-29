# System QA Report — 2026-07-29

**Status date:** 2026-07-29 (afternoon, after UI/payments/marketplace fixes)  
**Authoritative verdict:** Core role + payment monitoring + marketplace UI
regressions from Run B are **fixed and re-verified**. Cancellation E2E and
hosted QA remain **blocked on env** (missing project `service_role` secret /
no `APP_BASE_URL`).

---

## Objective

Runtime Playwright verification of Venora role surfaces and Platform Admin
**Payment monitoring** (`/admin/payments`) against local Next.js, using
`@venora.local` fixtures in gitignored `apps/web/.env.local`.

Companion day log: `docs/design/2026-07-29-ec-venue-listings-fix.md`.

---

## Environment

| Item | Value |
| ---- | ----- |
| Date | 2026-07-29 |
| Host OS | Windows 10 |
| App | `apps/web` (`@venora/web`) |
| Base URL | `http://127.0.0.1:3000` (hosted not configured) |
| Browser | Playwright Chromium |
| Auth helper | `apps/web/e2e/helpers/auth.ts` → `loginAs(role)` |
| Env file | `apps/web/.env.local` (gitignored) |

### Fixtures used

| Env prefix | Role / tier | Used |
| ---------- | ----------- | ---- |
| `E2E_CUSTOMER_*` | Customer | Yes |
| `E2E_VENUE_*` | Venue owner | Yes |
| `E2E_SUPPLIER_*` | Supplier | Yes |
| `E2E_SUPERADMIN_*` | Admin / `super_admin` | Yes |
| `E2E_COORDINATOR_*` | Event coordinator | Creds present; **no coordinator E2E suite** |
| `E2E_ANALYST_ADMIN_*` / `E2E_FINANCE_ADMIN_*` | Admin tiers | Absent — no finance-admin account in this env |
| Tenant / non-member pairs | RLS | Absent |

**Note:** There is no separate finance-admin user. Admin QA uses
`E2E_SUPERADMIN_*`. An early mislabel of superadmin as finance caused false
permission failures (Run A) — ignore those.

---

## Current scorecard (post-fix)

| Area | Verdict |
| ---- | ------- |
| Customer role isolation | **Pass** |
| Venue owner role isolation | **Pass** (including mobile 375/390 after fix) |
| Supplier role isolation | **Pass** (including mobile 375/390 after fix) |
| Super admin core | **Pass** (one remaining: slow “every module” crawl timeout) |
| Payment monitoring (`/admin/payments`) | **Pass** (guest, customer deny, workspace, nav) |
| Public smoke (`/`, `/login`, `/venues`) | **Pass** |
| Marketplace UI (favorite, estimate, sticky filters/card) | **Pass** after fix |
| Cancellation E2E | **Blocked** — `SUPABASE_SERVICE_ROLE_KEY` empty / wrong type |
| Hosted / Vercel QA | **Not run** — no `APP_BASE_URL` |
| Analyst / finance / RLS tenants / coordinator E2E | **Not covered** |

**Product brief — Payment monitoring:** Satisfied (dedicated module shipped).

---

## Afternoon fixes (verified)

Targeted Playwright re-run after product + test fixes: **13 passed**.

| Former failure | Fix | Re-verify |
| -------------- | --- | --------- |
| Venue/supplier mobile horizontal overflow | Chart `min-w-0` / `aspect-auto`; grid `minmax(0,…)`; dashboard `overflow-x-hidden` | Pass (375 + 390) |
| Admin nav “Payments” | `MaterialIcon` `aria-hidden`; assert `a[href="/admin/payments"]` | Pass |
| Anonymous featured favorite → login | `FeaturedVenueCard` → `/login?redirectTo=%2F&prompt=favorites` | Pass |
| Venue estimate guest count | Remount estimator with current guests; drop stale “no packages” precondition | Pass |
| Supplier sticky proposal card | Sticky `top-[9.5rem]`; test opens first live supplier | Pass |
| `/suppliers` desktop filters sticky | Desktop aside `aria-label="Supplier filters"` | Pass |
| Cancel page re-entry (product) | Terminal statuses `redirect(/bookings/[id])` | Code fixed; E2E seed still blocked |

### Key files touched

- `apps/web/src/components/dashboard/enterprise/charts/RevenueTrendChart.tsx`
- `apps/web/src/components/dashboard/enterprise/VenueOwnerOverview.tsx`
- `apps/web/src/components/dashboard/enterprise/SupplierOverview.tsx`
- `apps/web/src/components/dashboard/enterprise/ui.tsx`
- `apps/web/src/components/dashboard/enterprise/MaterialIcon.tsx`
- `apps/web/src/features/venues/ui/FeaturedVenueCard.tsx`
- `apps/web/src/features/ai/ui/CostEstimatorPanel.tsx`
- `apps/web/src/features/ai/ui/CostEstimatorForm.tsx`
- `apps/web/src/features/suppliers/ui/SuppliersMarketplaceClient.tsx`
- `apps/web/src/features/suppliers/ui/SupplierDetail.tsx`
- `apps/web/app/(customer)/bookings/[id]/cancel/page.tsx`
- `apps/web/e2e/qa/admin-payments-qa.spec.ts`
- `apps/web/e2e/qa/marketplace-qa.spec.ts`

---

## Role results (current)

### Customer — PASS

Suite: `e2e/auth/customer.spec.ts`

Login; bookings/favorites/profile; denied admin/VO/supplier; API denials;
commission injection blocked; `/bookings` responsive 375→1440.

### Venue owner — PASS

Suite: `e2e/auth/venue.spec.ts`

Dashboard + own routes; cross-role denials; **mobileSmall / mobileLarge no
horizontal overflow** (fixed).

### Supplier — PASS

Suite: `e2e/auth/supplier.spec.ts`

Dashboard + own records; cross-role denials; **mobile overflow fixed**.

### Super administrator — PASS (1 known flake)

Suite: `e2e/auth/super-admin.spec.ts`

| Check | Result |
| ----- | ------ |
| Login / overview modules / AI key hidden | Pass |
| Self-demotion / secrets endpoints blocked | Pass |
| `/admin` responsive | Pass |
| Sequential crawl of every admin module | **Timeout 60s** (latency; not Unauthorized). List does not yet include `/admin/payments`. |

### Event coordinator / analyst / finance — NOT EXECUTED

Coordinator creds exist but no dedicated spec. Analyst/finance fixtures absent.

---

## Payment monitoring — PASS

**Brief:** Satisfied — `/admin/payments` (KPIs, transactions, refunds, webhook
attention; `commissions.view`).

Suite: `e2e/qa/admin-payments-qa.spec.ts` (prefers `superadmin`)

| Check | Result |
| ----- | ------ |
| Unauthenticated blocked | Pass |
| Admin workspace + KPIs + filter `?status=paid` | Pass |
| Admin nav Payments link | Pass |
| Customer denied | Pass |

Evidence: `app/(admin)/admin/payments/page.tsx`,
`features/admin-payments/application/queries.ts`, `admin-modules.ts`,
`nav-config.ts` (ship: `139509d` / `d40c1d1`).

---

## Public + marketplace — PASS (post-fix)

### Public smoke — PASS

`/`, `/login`, `/venues` (status + axe serious/critical clean).

### Marketplace QA — PASS after fixes

| Check | Result |
| ----- | ------ |
| Landing search / discovery / overflow / featured identity | Pass |
| Venue booking sidebar sticky | Pass |
| Document scroll + footer | Pass |
| `/venues` + `/suppliers` desktop filters sticky | Pass |
| Anonymous featured favorite → login with `prompt=favorites` | Pass |
| Estimate dialog Guest Count mirrors booking guests | Pass |
| Supplier profile sticky proposal card (no back link) | Pass |

---

## Remaining open items

| Item | Status | Action |
| ---- | ------ | ------ |
| Cancellation E2E seed | Blocked | Set real `SUPABASE_SERVICE_ROLE_KEY` (`eyJ…` or `sb_secret_…`), not `sbp_…` |
| Cancel re-entry E2E | Blocked on seed | Product redirect already shipped |
| Super-admin “every module” timeout | Open | Raise timeout / parallelize; add `/admin/payments` |
| Hosted QA | Not configured | Add `APP_BASE_URL=https://…` (+ optional Vercel bypass) |
| Coordinator / analyst / RLS suites | Not covered | Add specs / fixtures |

### Env blockers (latest probe)

| Variable | Status |
| -------- | ------ |
| `SUPABASE_ACCESS_TOKEN` | SET (`sbp_…`) — OK for CLI |
| `SUPABASE_SERVICE_ROLE_KEY` | **empty** — required for cancellation seed |
| `APP_BASE_URL` / `VERCEL_TOKEN` | missing |

```env
# Project Settings → API → service_role or sb_secret_
SUPABASE_SERVICE_ROLE_KEY=...

# optional hosted
APP_BASE_URL=https://your-app.vercel.app
```

---

## Run history (context only)

| Run | Setup | Result | Notes |
| --- | ----- | ------ | ----- |
| A (~9.3m) | Superadmin creds in `E2E_FINANCE_*` | 65 pass / 20 fail | False finance denials — ignore |
| B (~7.0m) | Correct `E2E_SUPERADMIN_*` | 52 pass / 11 fail | Baseline before afternoon UI fixes |
| C (targeted) | After UI/payments/marketplace fixes | **13/13 pass** | Authoritative for those failures |
| D | Token attempts | Cancellation still fail | Wrong/empty service role |

---

## Re-run commands

```bash
# Full local role + marketplace batch
pnpm --filter @venora/web exec playwright test \
  e2e/qa/admin-payments-qa.spec.ts \
  e2e/auth/customer.spec.ts \
  e2e/auth/venue.spec.ts \
  e2e/auth/supplier.spec.ts \
  e2e/auth/super-admin.spec.ts \
  e2e/auth/cancellation-flow.spec.ts \
  e2e/qa/marketplace-qa.spec.ts \
  e2e/public-deployment-smoke.spec.ts \
  --reporter=list --workers=2

# Afternoon-fix subset
pnpm --filter @venora/web exec playwright test \
  e2e/qa/admin-payments-qa.spec.ts \
  e2e/auth/venue.spec.ts \
  e2e/auth/supplier.spec.ts \
  e2e/qa/marketplace-qa.spec.ts \
  --grep "mobileSmall|mobileLarge|Payments|favorite|estimate|sticky|Supplier filters|/suppliers keeps" \
  --reporter=list
```

---

## Related docs

- Day fix log: `docs/design/2026-07-29-ec-venue-listings-fix.md`
- Brief checklist: `docs/design/project-brief-role-checklist.md`
- Admin verification history: `docs/qa/administrator-verification.md`
- Gap analysis (UX-17 Done): `docs/design/ui-gap-analysis.md`
