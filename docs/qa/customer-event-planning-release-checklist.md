# Customer Event Planning Release Checklist

Date: July 31, 2026

Status: Documentation complete, release verification pending

## Product Flow

| Requirement | Status | Evidence |
| --- | --- | --- |
| Landing page links to `/plan-event`. | Verified | Landing action tests and browser E2E. |
| Browse venues CTA remains available. | Verified | Landing action tests and browser E2E. |
| `/plan-event` is public. | Verified | Browser E2E opens route anonymously. |
| Seven questionnaire sections render. | Verified | Browser E2E completes Event Basics, Date and Location, Guests and Budget, Venue Style, Facilities and Requirements, Services Needed, Booking Preferences. |
| Validation blocks invalid required answers. | Verified | Browser E2E invalid Continue test. |
| First invalid field receives focus. | Verified | Browser E2E focus assertion. |
| Event Plan Summary renders. | Verified | Browser E2E summary assertion. |
| Summary reflects saved answers. | Verified | Browser E2E and summary utility tests. |
| Summary edit flow works. | Verified | Browser E2E edit and return-to-summary test. |
| Start Over cancel keeps answers. | Verified | Browser E2E dialog test. |
| Start Over confirm clears local draft. | Verified | Browser E2E localStorage assertion. |
| Draft restores after refresh. | Verified | Browser E2E refresh/restore test. |
| Draft expires after 30 days. | Verified | Draft utility tests and constant inspection. |

## Authentication And Persistence

| Requirement | Status | Evidence |
| --- | --- | --- |
| Anonymous Save redirects to login. | Verified | Browser E2E URL assertion. |
| Login redirect target is `/plan-event`. | Verified | Browser E2E URL assertion. |
| Questionnaire answers are not placed in URL. | Verified | Browser E2E query-string privacy assertion. |
| Pending-save intent is created before auth redirect. | Verified | Auth handoff and account-save utility tests. |
| Local draft clears only after account save success. | Implemented but unverified | Covered by utility/action tests; not completed in live browser auth flow. |
| Authenticated autosave uses 900ms debounce after an account plan exists. | Implemented but unverified | Component inspection and account-save tests; live browser row update unverified. |
| Duplicate save protection works. | Verified | Event-plan account/action/repository tests and fingerprint index contract. |
| Registration return works after email confirmation. | Implemented but unverified | Email-confirmation boundary not completed in browser. |

## Venue Search Handoff

| Requirement | Status | Evidence |
| --- | --- | --- |
| Find Matching Venues navigates to `/venues`. | Verified | Browser E2E handoff test. |
| Supported filters are mapped. | Verified | Browser E2E checks event, province, city, capacity, venueTypes, indoorOutdoor, amenities, and sort. |
| Unsupported criteria remain stored only. | Verified | Mapper tests and persistence tests. |
| Total event budget is not mapped to venue pricing. | Verified | Browser E2E and mapper tests. |
| Browser Back preserves plan state. | Verified | Browser E2E back-to-summary assertion. |
| Direct venue search still works without event-plan params. | Verified | Venue query tests. |

## Accessibility

| Requirement | Status | Evidence |
| --- | --- | --- |
| One clear H1 per step. | Verified | Browser and component inspection. |
| Logical field labels. | Verified | Component inspection and Playwright label selectors. |
| Fieldsets and legends for choice groups. | Verified | Component inspection. |
| Error messages connected to fields. | Verified | Component inspection. |
| Focus moves after step navigation. | Verified | Browser E2E. |
| Focus returns after summary edit. | Verified | Browser E2E. |
| Dialog focus trap. | Verified | Browser E2E Tab loop assertion. |
| Dialog Escape support. | Verified | Browser E2E Escape assertion. |
| Axe first-step smoke test. | Verified | Browser E2E axe test. |
| 200% zoom. | Implemented but unverified | No dedicated zoom automation in this pass. |
| Reduced motion. | Implemented but unverified | No dedicated reduced-motion automation in this pass. |

## Responsive

| Viewport | Status | Evidence |
| --- | --- | --- |
| 1440 x 900 | Verified | Browser E2E no-overflow test. |
| 1280 x 800 | Verified | Browser E2E no-overflow test. |
| 1024 x 768 | Verified | Browser E2E no-overflow test. |
| 768 x 1024 | Verified | Browser E2E no-overflow test. |
| 390 x 844 | Verified | Browser E2E no-overflow test. |
| 360 x 800 | Verified | Browser E2E no-overflow test. |

## Security And Authorization

| Requirement | Status | Evidence |
| --- | --- | --- |
| Anonymous users cannot create persisted event plans. | Verified | Event-plan action tests and migration/database contracts. |
| Customer-only ownership is enforced in repository methods. | Verified | Event-plan repository tests. |
| RLS policies exist for `event_plans`. | Verified | Migration test and database contract validator. |
| Raw Supabase/RLS errors are hidden. | Verified | Event-plan action tests. |
| Live Customer A vs Customer B browser denial. | Implemented but unverified | Not completed in browser. |
| Live venue owner/supplier/coordinator denial. | Implemented but unverified | Not completed in browser. |
| Service role not exposed to client. | Verified | Code inspection and action/repository pattern. |

## Final Acceptance Criteria Totals

From `docs/plans/customer-event-planning-phase-1.md` section 24:

- Verified: 25
- Implemented but unverified: 6
- Failed: 0
- Not applicable: 0

The implemented-but-unverified items are:

- Authentication handoff preserves the plan.
- Authenticated customer can save.
- Cross-account access fails.
- Venue owners cannot access private plans.
- Suppliers cannot access private plans.
- Unassigned coordinators cannot access private plans.

## Final Validation Commands

| Check | Status | Evidence |
| --- | --- | --- |
| Event-planning tests. | Verified | `pnpm --filter @venora/web test -- src/features/event-planning`: 58/58 passed. |
| Event-planning browser E2E tests. | Verified | `node_modules/.bin/playwright.cmd test e2e/event-planning.spec.ts` from `C:\venora\apps\web`: 12/12 passed. |
| Auth regression tests. | Verified | `pnpm --filter @venora/web test -- src/lib/profile-setup.test.ts src/middleware.test.ts src/features/auth`: 15/15 passed. |
| Venue-search tests. | Verified | `pnpm --filter @venora/web test -- src/features/venues/application/queries.test.ts src/features/event-planning/utils/event-plan-search-mapper.test.ts`: 5/5 passed. |
| Event-plan RLS/ownership contract tests. | Verified | `pnpm --filter @venora/web test -- src/features/event-planning/infrastructure/event-plan.migration.test.ts src/features/event-planning/application/event-plan.actions.test.ts src/features/event-planning/infrastructure/event-plan.repository.test.ts`: 19/19 passed. |
| Available database contract tests. | Verified | `pnpm test:database`: passed with known allowlisted migration warnings. |
| Type-check. | Verified | `pnpm --filter @venora/web type-check`: serialized rerun passed. |
| Build. | Verified | `pnpm --filter @venora/web build`: passed. |
| Conflict marker scan. | Verified | `git grep -n -E "^(<<<<<<<\|=======\|>>>>>>>)"` returned no matches. |
| Diff whitespace check. | Verified | `git diff --check` passed with Windows line-ending warnings only. |
| Git status/stat/log. | Verified | `git status --short`, `git diff --stat`, and `git log --oneline -15` reviewed before commit. |

## Release Decision

Do not classify Phase 1 as fully release-verified while the live authenticated browser matrix remains unverified.

Current release posture:

- Automated contract verification: ready after fresh commands pass.
- Local database/RLS verification: ready after fresh database command passes.
- Public browser E2E verification: ready after fresh browser command passes.
- Live authenticated browser verification: pending.
