# Customer Event Planning QA Test Report

Date: July 31, 2026

Classification: Documentation complete, release verification pending

## Scope

Task 21 finalized documentation and performed a fresh acceptance-criteria review for Customer Event Planning Phase 1.

No application code, migrations, package files, lockfiles, or dependencies were changed.

## Fresh Commands

| Command | Result | Notes |
| --- | --- | --- |
| `pnpm --filter @venora/web test -- src/features/event-planning` | Passed | 12 files, 58 tests passed. |
| `apps/web/node_modules/.bin/playwright.cmd test e2e/event-planning.spec.ts` from `C:\venora` | Failed | Playwright did not load the `apps/web` config from the root working directory; relative `page.goto("/plan-event")` had no base URL. |
| `node_modules/.bin/playwright.cmd test e2e/event-planning.spec.ts` from `C:\venora\apps\web` | Passed | 12/12 browser tests passed with the configured base URL and webServer. |
| `pnpm --filter @venora/web test -- src/lib/profile-setup.test.ts src/middleware.test.ts src/features/auth` | Passed | 2 files, 15 tests passed. |
| `pnpm --filter @venora/web test -- src/features/venues/application/queries.test.ts src/features/event-planning/utils/event-plan-search-mapper.test.ts` | Passed | 2 files, 5 tests passed. |
| `pnpm --filter @venora/web test -- src/features/event-planning/infrastructure/event-plan.migration.test.ts src/features/event-planning/application/event-plan.actions.test.ts src/features/event-planning/infrastructure/event-plan.repository.test.ts` | Passed | 3 files, 19 tests passed. |
| `pnpm test:database` | Passed | 128 migrations/contracts valid; known allowlisted warnings only. |
| `pnpm --filter @venora/web type-check` | Failed, then passed | First run was parallel with build and hit transient `.next/types` churn; serialized rerun passed. |
| `pnpm --filter @venora/web build` | Passed | Next production build passed. |
| `git grep -n -E "^(<<<<<<<\|=======\|>>>>>>>)"` | Passed | No matches; command returned exit 1 with no output. |
| `git diff --check` | Passed | No whitespace errors; Windows line-ending warnings only. |
| `git status --short` | Passed | Documentation-only changes before commit. |
| `git diff --stat` | Passed | QA doc diff reviewed. |
| `git log --oneline -15` | Passed | Recent event-planning commit stack reviewed. |

## Automated Contract Verification

Automated tests cover:

- Event-plan domain constants, schemas, draft storage, summary, wizard utilities, auth handoff, account-save utility, server actions, repository, and migration shape.
- Duplicate-save protection through source draft fingerprint behavior.
- Safe server-action errors for unauthenticated and persistence failures.
- Venue-search mapping for supported filters and preservation of unsupported criteria.
- The explicit decision not to map total event budget into venue pricing.
- Landing-page CTA configuration.
- Auth and route regression areas used by the event-planning handoff.

## Browser E2E Coverage

Browser E2E coverage includes:

- Anonymous `/plan-event` access.
- Completing all seven questionnaire sections.
- Validation and first-invalid-field focus.
- Event Plan Summary rendering.
- Summary edit and return focus.
- Draft restore after refresh.
- Start Over cancel and confirm behavior.
- Dialog Tab loop and Escape behavior.
- Anonymous save redirect to `/login?redirectTo=/plan-event`.
- URL privacy for questionnaire answers.
- Venue-search handoff with supported mappings.
- Total event budget not appearing as venue price params.
- Browser Back from `/venues` restoring the summary.
- Landing-page Start planning and Browse venues CTAs.
- Axe first-step smoke test.
- Horizontal overflow checks at desktop, tablet, and mobile widths.

## Local Database And RLS Verification

Database and RLS contracts cover:

- `event_plans` table creation.
- Customer ownership field.
- Status and structured-field checks.
- Indexes, including customer/fingerprint duplicate protection.
- RLS enabled.
- Anonymous grants revoked.
- Authenticated access limited by `auth.uid() = customer_id`.
- Repository methods scoped by customer id.
- Safe fallback handling for RLS/database errors.

## Real Browser Verification

Real browser checks completed:

- Public anonymous questionnaire journey.
- Responsive public wizard checks.
- Accessibility smoke checks.
- Anonymous auth redirect and URL privacy.
- Public venue-search handoff.

Real browser checks not completed:

- Registration email-confirmation return flow.
- Live Customer A vs Customer B authorization matrix.
- Live venue-owner, supplier, and coordinator private-plan denial.
- Authenticated autosave against a real browser-created `event_plans` row.
- Autosave server failure and retry in a real browser session.

## Acceptance Criteria Review

| Criterion from plan | Status | Evidence |
| --- | --- | --- |
| `/plan-event` works. | Verified | Browser E2E opens and completes `/plan-event`. |
| Existing AI planner remains unchanged. | Verified | Scope/code inspection; no Task 21 app changes. |
| Anonymous users can complete the wizard. | Verified | Browser E2E full anonymous journey. |
| Draft survives refresh. | Verified | Browser E2E local draft restore. |
| Back navigation preserves data. | Verified | Browser E2E returns from `/venues` to summary. |
| Optional questions can be skipped. | Verified | Wizard validation and browser journey permit optional omissions. |
| Validation works. | Verified | Browser E2E invalid Continue and focus assertion. |
| Summary accurately reflects answers. | Verified | Browser E2E summary assertions and summary utility tests. |
| Summary sections can be edited. | Verified | Browser E2E edit and return-to-summary focus. |
| Authentication handoff preserves the plan. | Implemented but unverified | Anonymous redirect and pending-save intent verified; real login/registration return not live-browser verified. |
| Authenticated customer can save. | Implemented but unverified | Action/account-save contracts pass; live authenticated browser save unverified. |
| Duplicate plans are not created. | Verified | Account/action/repository duplicate fingerprint tests. |
| Customer-only RLS works. | Verified | Migration, repository, and database contract tests. |
| Cross-account access fails. | Implemented but unverified | Customer scoping is contract-tested; live Customer A vs Customer B browser matrix unverified. |
| Venue owners cannot access private plans. | Implemented but unverified | Customer-only RLS shape is contract-tested; live browser denial unverified. |
| Suppliers cannot access private plans. | Implemented but unverified | Customer-only RLS shape is contract-tested; live browser denial unverified. |
| Unassigned coordinators cannot access private plans. | Implemented but unverified | Customer-only RLS shape is contract-tested; live browser denial unverified. |
| Search handoff applies supported filters. | Verified | Browser E2E and mapper tests. |
| Unsupported criteria remain stored. | Verified | Mapper tests and persistence schema/action tests. |
| No fake AI claims appear. | Verified | Code/browser inspection of deterministic journey. |
| No fake availability appears. | Verified | Code/browser inspection; venue handoff only searches filters. |
| Desktop works. | Verified | Browser E2E 1440 and 1280 viewport checks. |
| Tablet works. | Verified | Browser E2E 1024 and 768 viewport checks. |
| Mobile works. | Verified | Browser E2E 390 and 360 viewport checks. |
| Accessibility passes. | Verified | Axe smoke, keyboard, focus, and semantic checks. |
| Automated tests pass. | Verified | Fresh Task 21 unit/contract/database commands passed. |
| Browser tests pass. | Verified | Fresh configured Playwright run passed 12/12 from `C:\venora\apps\web`. |
| Type-check passes. | Verified | Fresh serialized `pnpm --filter @venora/web type-check` passed. |
| Build passes. | Verified | Fresh `pnpm --filter @venora/web build` passed. |
| `package.json` is unchanged. | Verified | Task 21 did not edit package files. |
| `pnpm-lock.yaml` is unchanged. | Verified | Task 21 did not edit lockfile. |

Acceptance totals:

- Verified: 25
- Implemented but unverified: 6
- Failed: 0
- Not applicable: 0

## Failed Or Unavailable Checks

- Initial Playwright command from `C:\venora` failed because it did not load `apps/web/playwright.config.ts`; impact is low because the configured rerun from `C:\venora\apps\web` passed 12/12.
- Initial type-check command failed while running in parallel with build because `.next/types` was being rewritten; impact is low because serialized rerun passed.
- No requested validation suite remained unavailable.
- `git diff --check` emitted Windows line-ending warnings only; no whitespace errors.

## Current Release Classification

Documentation complete, release verification pending.

The feature can proceed to final branch and release review after fresh Task 21 validation commands are recorded. It should not be classified as fully release-verified until the live authenticated browser matrix is completed.
