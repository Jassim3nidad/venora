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

## Migration 065 — internal-function grant hardening (full-application audit)

A broader, full-application follow-up audit (beyond the administrator
platform this document otherwise covers) re-examined every
`SECURITY DEFINER` function's grants against the pattern migration 047
established: `REVOKE EXECUTE ... FROM PUBLIC` alone is insufficient on
this project (this project's default privileges grant execute directly to
`anon`/`authenticated`, not only via `PUBLIC`), so a revoke must name
`anon, authenticated` explicitly. Seven functions created after 047 (plus
two predating it) had never been brought in line with that pattern.
Migration `065_lock_down_internal_only_functions.sql` closes the gap;
none of the seven are called directly from application or Edge Function
client code except one, which already authenticates via the service-role
key.

Applied to production and verified two ways: `supabase db push --dry-run`
now reports "Remote database is up to date," and an unauthenticated
request to one of the seven functions via the anon key now returns
`401 permission denied for function ... (42501)` where it previously
would not have been rejected at the grant level.

Also fixed in this same audit pass (all pushed to `main`, commit history
starting at `a44cf4c`):
- Migrated the deprecated `middleware.ts` convention to Next 16's `proxy.ts`.
- Fixed a Turbopack workspace-root ambiguity in the build.
- Restored map attribution (was disabled, contrary to the tile provider's
  terms) and added accessible names to both MapLibre map components.
- Fixed a webhook route (`/api/webhooks/maya`) that called a database
  function signature migration 046 had already dropped, which would have
  thrown an unhandled exception on any real invocation. Not currently
  reachable in production (no active gateway is registered for that
  provider), but now fails safely instead of leaking a raw error.
- Documented a missing `OPENROUTER_API_KEY` entry in the Edge Function
  env example.

OpenRouter/AI integration (all six AI Edge Functions) and the PayMongo
payment integration were also independently re-verified in this pass:
provider/model configuration, key handling, rate/spend limits, moderation,
and usage-log content all matched policy, with the full Deno (20/20) and
Vitest (payments: 45/45, full suite: 86/86) test suites passing.

## Follow-up verification — SEO/performance pass, cancellation flow, and production smoke test

A further follow-up session (after the SEO/performance/dead-code work
described below this section in commit history — `feat(seo)` through
`refactor(rbac)`) closed out the items this document had previously
listed as blocked or deferred.

**Production cancellation flow.** Explicitly authorized and run against
`e2e/auth/cancellation-flow.spec.ts`, which already had proper
disposable-record and cleanup mechanics: `beforeEach` inserts a synthetic
booking (dedicated QA customer ID, a far-future event date of
2099-10-01, real venue/package IDs only for the FK reference) and
`afterEach` unconditionally deletes every row it touched — notifications,
`booking_status_history`, `audit_logs`, then the booking itself —
regardless of pass/fail. Both tests passed: the real customer fixture can
cancel their own booking with **exactly one** `audit_logs` row and
**exactly one** `booking_status_history` row (confirming migration 064's
fix holds under a real authenticated session, not just the RPC-level
check `scripts/validate-cancellation-history.mjs` already covered), and
the cancel page's own re-entry guard blocks a second cancellation attempt
before the RPC is ever reached. Cleanup was independently re-verified
after the run by querying for any remaining bookings matching the test's
customer ID + event date signature — zero found.

**Migration history and remote sync.** `supabase migration list --linked`
shows all 65 local migrations matching their remote counterparts,
including 065. `supabase db push --dry-run` reports "Remote database is
up to date."

**Production smoke test against the exact deployed commit.** Verified via
`vercel inspect <url> --logs`, which shows the live production
deployment's build log cloning `github.com/Jassim3nidad/venora (Branch:
main, Commit: 0409241)` — an exact match to local `HEAD`
(`0409241547ce81fde05cd9c72641fbd6d4e6e894`) at the time of this check.
Ran the full authenticated Playwright suite — analyst-admin, finance-admin,
super-admin, customer, supplier, venue, and cross-tenant specs — with
`APP_BASE_URL=https://venora-web.vercel.app` (not localhost) using the
real QA fixture credentials: **109 passed, 2 skipped (the same
pre-existing "not testable with current seed data" cross-tenant cases),
0 failed**, in 4.2 minutes.

## Remaining risks

- One moderate, transitive `postcss` advisory bundled inside
  `next@16.2.10`'s own dependency tree (GHSA-qx2v-qp2m-jg93) — not a
  direct dependency, not introduced by this work, not independently
  patchable without a Next.js upstream release.
- Notification-deduplication has no dedicated test
  (`e2e/notifications.spec.ts` covers push-subscription and realtime
  delivery, not dedup specifically) and was not added in this pass.
- The two QA fixture passwords should be rotated by the user now that they
  are retained long-term.
- Two separate Supabase access tokens (one in the engagement that produced
  the rest of this document, one in the full-application audit that added
  the Migration 065 section, both reused again in this follow-up pass)
  were shared directly in chat — all recommended for revocation/rotation
  in the Supabase dashboard.
- The Maya payment webhook route is present but not functionally wired to
  a real gateway (no `MayaGateway` implementation is registered) and its
  `confirmBookingPayment` handler now throws a documented, safe error
  rather than attempting the stale RPC call. If Maya is ever activated,
  that handler needs a full rebuild to match the checkout-session
  reconciliation contract PayMongo's webhook already follows.
- A status-color-map drift risk (booking status colors hand-maintained
  independently in two places using two different color systems) and one
  duplicated "no results" empty-state JSX block (suppliers marketplace vs
  venues marketplace) were identified during a code-duplication pass but
  not fixed — accepted as low-priority technical debt, not a production
  blocker.
