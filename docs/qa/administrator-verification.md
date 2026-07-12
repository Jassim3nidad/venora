# Administrator Platform: Final Production Verification

## Scope

Closed two remaining blockers on analyst and finance administrator role
verification, then ran a full production verification pass: repo/deployment
state, a permission-aware Overview fix, an automated accessibility audit,
Supabase migration status, authenticated production smoke tests, and
credential hygiene.

## HTTP 500 on forbidden fine-grained admin pages (root cause, fixed earlier this engagement)

`requirePermission()` throws `ForbiddenError`/`UnauthorizedError` for an
admin lacking a specific permission, but no `error.tsx` exists in the
`(admin)` route group, so the throw crashed to Next.js's default handler
(HTTP 500) instead of a clean denial. Fixed by adding
`requirePermissionOrRedirect()` (`src/lib/rbac/admin-context.ts`), used by
all 13 admin page components; forbidden routes now redirect to
`/unauthorized`.

## Overview quick-link permission filtering

`AdminOverview.tsx`'s "Admin Modules" quick-link grid and two action
buttons (Review Applications, Review Venues, Manage Reviews) rendered for
every tier regardless of permission, unlike the sidebar. Fixed by computing
visibility in `app/(admin)/admin/page.tsx` against the same
`NAV_BY_ROLE.admin` permission map the sidebar uses — no second permission
list. `ADMIN_MODULES` moved to a plain `admin-modules.ts` module: Server
Components can't `.map()`/`.filter()` a plain array exported from a
`"use client"` file (it resolves to a client-reference proxy).

## Accessibility audit (`@axe-core/playwright`, WCAG 2.1 A/AA)

Audited all 12 listed admin routes (super_admin) plus the routes analyst
and finance_admin actually have permission for, `/unauthorized`, and all 4
required viewports, plus manual keyboard/focus/dialog/label checks.

Violations found and fixed:
- **color-contrast**: `text-red-600` (~4.8:1, borderline) → `text-red-700`
  (~6.5:1) on danger text across the sign-out control and several admin
  detail pages; `text-[#9ca3af]` (~2.5:1, fails AA) → the already-passing
  `text-[#6b7280]` (~4.8:1) across settings, AI configuration, commissions,
  and 8 admin route files.
- **critical "label"**: the system-settings value input and reason input in
  `SettingRow.tsx` had no accessible name at all — added `aria-label`.
- **serious "scrollable-region-focusable"**: the shared `DataTable`'s
  horizontally-scrolling wrapper wasn't keyboard-reachable — added
  `role="region"`/`aria-label`/`tabIndex`.
- **dialog focus-trap/restoration**: `AssignTierDialog` and
  `EditCommissionRuleDialog` were hand-rolled `role="dialog"` divs with no
  focus management (no auto-focus, no trap, no Escape handling, no focus
  restoration). Rebuilt both on `@radix-ui/react-dialog` (already a project
  dependency, previously unused).
- **reduced motion**: no `@media (prefers-reduced-motion: reduce)` rule
  existed — added one.

Result: 36/36 accessibility tests passing.

## Supabase migration verification

No `SUPABASE_ACCESS_TOKEN` was available in this environment initially
(checked process env, `apps/web/.env.local`, `apps/web/.env`), so this
phase was first reported blocked. The user then supplied a token directly
and `supabase migration list --linked` ran: 63 of 64 migrations matched;
`064_fix_duplicate_cancellation_history.sql` was pending on the remote.

This migration fixes two real issues in `cancel_booking_request()`, both
live in production until applied: (1) a duplicate `booking_status_history`
row per cancellation plus a missing `audit_logs` entry, and (2) a
permission-check bug that could let a cancellation request bypass its
authorization check under certain conditions. See the migration file's own
comments for the exact mechanism.

`db push --dry-run` confirmed only migration 064 was pending — no real
push was run. The user applied the migration's SQL manually via the
Supabase Dashboard SQL editor (the established pattern throughout this
engagement). The CLI's own migration-history bookkeeping table didn't
reflect this until `supabase migration repair --status applied 064
--linked` was run (metadata-only — no schema/data change), with the user's
explicit authorization after the initial classifier block on that write.
Final `db push --dry-run`: **"Remote database is up to date."**

## Production smoke tests

Ran the analyst/finance/super-admin Playwright suites against
`https://venora-web.vercel.app` (commit `ac499cd`, the production HEAD at
the time): 74/77 passed. The 3 failures were the newly-added Overview
permission-card tests, which reference a `data-testid` only present in the
not-yet-deployed commits from this session — expected, not a regression.
Confirmed via `curl`: unauthenticated `/admin` and `/admin/settings` return
307 redirects to `/login`; unauthenticated report export returns 401; no
raw error/stack-trace payloads on malformed requests.

Two checklist items were **not verified**:
- **Production cancellation flow**: the existing
  `e2e/auth/cancellation-flow.spec.ts` performs real service-role
  INSERT/DELETE against the shared production database. Running it against
  production was blocked by the environment's safety controls (a
  data-mutating action against shared infrastructure without explicit,
  specific authorization) and was not overridden.
- **Notification deduplication**: no dedicated test exists for this
  (`e2e/notifications.spec.ts` covers push-subscription and realtime
  delivery, not dedup, and requires credentials not configured in this
  environment).

## Credential hygiene

QA fixture credentials exist only in gitignored `apps/web/.env.local`.
Searched full git history and the current tracked tree for the QA
passwords and other common secret patterns (API keys, JWTs) — none found.
`test-results/` and `playwright/.auth/` are gitignored and have zero
tracked files. The two QA fixture passwords (`analyst-admin@venora.local`,
`finance-admin@venora.local`) were visible in chat during creation earlier
in this engagement; since the user chose to retain both fixtures
permanently, both passwords should be rotated via the Supabase dashboard
and `apps/web/.env.local` updated locally (not committed).

## Remaining risks

- One moderate, transitive `postcss` advisory bundled inside
  `next@16.2.10`'s own dependency tree (GHSA-qx2v-qp2m-jg93) — not a
  direct dependency, not introduced by this work, not independently
  patchable without a Next.js upstream release.
- Production cancellation-flow and notification-deduplication checks were
  not run (see above) — pending explicit authorization or dedicated
  non-production fixtures. Migration 064's fix to this same function is
  now live, so the cancellation-flow test's assertions (exactly one
  `audit_logs` row per cancellation) should hold if it's ever run.
- The two QA fixture passwords should be rotated by the user now that they
  are retained long-term.
- The Supabase access token used to run the migration checks and repair
  was shared directly in chat — recommend revoking/rotating it in the
  Supabase dashboard.
