# Customer Event Planning QA Test Report

Date: July 31, 2026

Classification: Implemented but browser verification incomplete

## Scope

Tasks 19-20 only:

- Final visual and responsive polish for `/plan-event` and the landing CTA.
- Accessibility verification and focused fixes.
- Browser E2E coverage for public event-planning flows.
- Authorization and regression verification through existing action, repository, migration, and database contracts.
- QA documentation for the next release-validation phase.

Out of scope:

- Task 21 feature documentation.
- `/account/event-planner`.
- New product functionality.
- Event plan migrations.
- Package or lockfile changes.

## Commands Executed

| Command | Result | Notes |
| --- | --- | --- |
| `git status` | Passed | Clean before edits. |
| `git diff --stat` | Passed | No pre-existing diff. |
| `git branch --show-current` | Passed | `feature/customer-event-planning-phase-1`. |
| `git log -15 --oneline` | Passed | Confirmed prior event-planning commits. |
| `pnpm --filter @venora/web exec playwright test e2e/event-planning.spec.ts` | Failed | `playwright` was not resolved by `pnpm exec` in this shell. |
| `apps/web/node_modules/.bin/playwright.cmd test e2e/event-planning.spec.ts` | Passed | 12/12 browser tests passed after focused fixes. |
| `pnpm --filter @venora/web exec vitest run src/features/event-planning` | Failed | `vitest` was not resolved by `pnpm exec` in this shell. |
| `apps/web/node_modules/.bin/vitest.cmd run src/features/event-planning` | Passed | 12 files, 58 tests passed. |
| `apps/web/node_modules/.bin/vitest.cmd run src/lib/profile-setup.test.ts src/middleware.test.ts src/features/auth` | Passed | 2 files, 15 tests passed. |
| `apps/web/node_modules/.bin/vitest.cmd run src/features/venues/application/queries.test.ts src/features/event-planning/utils/event-plan-search-mapper.test.ts` | Passed | 2 files, 5 tests passed. |
| `apps/web/node_modules/.bin/vitest.cmd run src/features/event-planning/infrastructure/event-plan.migration.test.ts src/features/event-planning/application/event-plan.actions.test.ts src/features/event-planning/infrastructure/event-plan.repository.test.ts` | Passed | 3 files, 19 tests passed. |
| `pnpm test:database` | Passed | 128 migrations/contracts valid; existing allowlisted warnings only. |
| `apps/web/node_modules/.bin/tsc.cmd --noEmit` | Passed | Direct local binary run. |
| `pnpm --filter @venora/web type-check` | Passed | Initial final rerun hit stale generated `.next/dev` route types from the dev server; removed only `apps/web/.next/dev`; rerun passed. |
| `apps/web/node_modules/.bin/next.cmd build --webpack` | Passed | Direct local binary run. |
| `pnpm --filter @venora/web build` | Passed | Exact requested command passed with elevated filesystem access. |

## Test Totals

- Event-planning Vitest suite: 58/58 passed.
- Auth/regression Vitest subset: 15/15 passed.
- Venue-search mapper/query subset: 5/5 passed.
- Event-plan migration/action/repository ownership tests: 19/19 passed.
- Event-planning Playwright suite: 12/12 passed.
- Database contract validation: passed.

## Browser Scenarios Executed

Implemented browser file:

- `apps/web/e2e/event-planning.spec.ts`

Executed and passed:

- Anonymous complete journey from `/plan-event` to summary.
- Required validation on Step 1 with focus moving to the first invalid radio.
- Edit-from-summary flow and focus return to the edited summary section.
- Draft restoration after refresh.
- Start Over cancel and confirm flows.
- Start Over dialog Tab trap and Escape behavior.
- Anonymous save handoff to `/login?redirectTo=/plan-event`.
- URL privacy check: no event type, location, or guest answers in login URL.
- Venue-search handoff to `/venues`.
- Supported search params present: event, province, city, capacity, venueTypes, indoorOutdoor, amenities, sort.
- Total event budget not mapped into venue pricing params.
- Browser Back from `/venues` restores the summary.
- Landing-page Start planning CTA and Browse venues CTA remain visible.
- `/plan-event` does not require authentication.
- Axe smoke check on the first step has no violations.
- Horizontal overflow checks at all required viewport sizes.

Not fully browser-verified:

- Registration return with real email confirmation.
- Authenticated customer autosave against a real event_plans row.
- Autosave server failure and retry in a real browser session.
- Live Customer A vs Customer B browser RLS denial.
- Live venue-owner, supplier, and coordinator direct private-plan access denial.

Those areas are covered by unit/action/repository/migration contracts, but not by a complete browser-backed Supabase account matrix in this pass.

## Viewports Tested

The Playwright suite tested `/plan-event` for horizontal overflow and first-step navigation at:

- 1440 x 900
- 1280 x 800
- 1024 x 768
- 768 x 1024
- 390 x 844
- 360 x 800

Result:

- No horizontal overflow.
- Step heading visible.
- Progress and first-step controls usable.
- Date/location next-step render remains stable.

## Accessibility Checks

Passed:

- One visible `h1` per active step.
- Field labels on text, number, date, select, and textarea controls.
- Radio and checkbox groups use `fieldset` and `legend`.
- Error messages use `aria-describedby` on affected fields/groups.
- Invalid fields use `aria-invalid`.
- First invalid field receives focus after failed Continue.
- Step headings receive focus after step changes.
- Summary edit return focus is preserved.
- Save status uses restrained `aria-live="polite"`.
- Save success/error messages use status/alert roles.
- Start Over dialog uses `role="dialog"`, `aria-modal`, title, and description.
- Start Over dialog traps Tab and supports Escape.
- Focus returns or moves intentionally after cancel/confirm.
- Touch targets meet the 44px minimum in the tested controls.
- Axe first-step smoke test passed.

Fixed:

- Added Start Over dialog focus trap and Escape close behavior.
- Fixed summary edit return focus being stolen by the step-heading effect.

## RLS and Authorization Checks

Verified by automated contracts:

- Migration creates `event_plans` with RLS enabled.
- Anonymous grants are revoked.
- Authenticated users can access only owner-scoped event plan rows.
- Repository methods scope reads/writes by `customer_id`.
- Server actions reject unauthenticated users.
- Server actions mask raw Supabase/RLS errors.
- Duplicate plan saves are protected by the event-plan fingerprint path.
- Database contract validator passed.

Not completed in browser:

- Live Customer A and Customer B direct browser/database RLS matrix.
- Venue owner, supplier, and coordinator live direct private-plan denial.

Reason:

- This QA pass used existing local tests and Playwright public flows. No additional live fixture setup or migration repair was performed, per task constraints.

## Console and Hydration Results

Observed during Playwright:

- No event-planning hydration failures.
- No duplicate initialization found in draft restoration tests.
- No event-plan data appeared in URLs.
- No event-plan content was added to browser-visible query strings.

Non-blocking warnings observed:

- Existing Next module-type warning for Tailwind config and package preset.
- Existing Next image warning for a Supabase venue image resolving to a private IP during `/venues` handoff.
- Existing Next scroll-behavior warning during route transitions.

## Defects Found and Fixed

| Defect | Root cause | Fix |
| --- | --- | --- |
| Start Over dialog did not trap focus or support Escape. | Custom dialog only focused the cancel button on open. | Added Tab loop, Escape cancel, and confirm button ref. |
| Returning from a summary edit did not keep focus on the edited summary section. | Clearing `summaryFocusStep` triggered a second effect pass that focused the page heading. | Added a ref guard to skip the next heading focus after summary-section focus. |
| `/venues` handoff logged a Supabase parse error for venue type filters. | Query used PostgREST `.or(...)` with nested relation paths. | Removed invalid nested OR filters and kept related-table filtering in the existing client-side marketplace filter layer. |

## Checks That Could Not Run Exactly As Requested

- `pnpm --filter @venora/web exec playwright ...` and `pnpm --filter @venora/web exec vitest ...` did not resolve local binaries in this shell.
- Equivalent installed local binaries were run successfully.
- Full live browser auth/RLS matrix was not completed.
- Registration confirmation flow was not completed because it depends on the local email verification boundary.

## Final Classification

Implemented but browser verification incomplete.

Public event-planning flows, responsive smoke checks, accessibility smoke checks, unit tests, action/repository ownership contracts, database contracts, type-check, and build passed. Live authenticated browser autosave and cross-account RLS remain unverified in browser.
