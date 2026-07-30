# Customer Event Planning Release Checklist

Date: July 31, 2026

## Product Flow

| Requirement | Status | Evidence |
| --- | --- | --- |
| Landing page links to `/plan-event`. | Verified | Playwright landing CTA test. |
| Browse venues CTA remains available. | Verified | Playwright landing CTA test. |
| `/plan-event` is public. | Verified | Playwright opens route anonymously. |
| Seven questionnaire sections render. | Verified | Playwright completes all steps. |
| Validation blocks invalid required answers. | Verified | Step 1 invalid Continue test. |
| First invalid field receives focus. | Verified | Step 1 focus assertion. |
| Event Plan Summary renders after completion. | Verified | Playwright summary assertion. |
| Summary edit flow works. | Verified | Playwright edit and return-to-summary test. |
| Start Over cancel keeps answers. | Verified | Playwright dialog test. |
| Start Over confirm clears local draft. | Verified | Playwright localStorage assertion. |
| Draft restores after refresh. | Verified | Playwright refresh/restore test. |

## Authentication And Persistence

| Requirement | Status | Evidence |
| --- | --- | --- |
| Anonymous Save redirects to login. | Verified | Playwright URL assertion. |
| Login redirect target is `/plan-event`. | Verified | Playwright URL assertion. |
| Questionnaire answers are not placed in URL. | Verified | Playwright query-string privacy assertion. |
| Local draft clears only after account save success. | Implemented but unverified | Covered by unit tests; not completed in live browser auth flow. |
| Authenticated autosave works. | Implemented but unverified | Account-save tests pass; live browser autosave not completed. |
| Duplicate save protection works. | Verified | Event-plan account/action tests. |
| Registration return works. | Implemented but unverified | Email confirmation boundary not completed in browser. |

## Venue Search Handoff

| Requirement | Status | Evidence |
| --- | --- | --- |
| Find Matching Venues navigates to `/venues`. | Verified | Playwright handoff test. |
| Supported filters are mapped. | Verified | Playwright checks event, province, city, capacity, venueTypes, indoorOutdoor, amenities. |
| Unsupported criteria remain stored only. | Verified | Mapper tests and URL assertions. |
| Total event budget is not mapped to venue pricing. | Verified | Playwright and mapper tests. |
| Browser Back preserves plan state. | Verified | Playwright back-to-summary assertion. |
| Direct venue search still works without event-plan params. | Verified | Existing venue query tests and build. |

## Accessibility

| Requirement | Status | Evidence |
| --- | --- | --- |
| One clear H1 per step. | Verified | Browser and component inspection. |
| Logical field labels. | Verified | Component inspection and Playwright label selectors. |
| Fieldsets and legends for choice groups. | Verified | Component inspection. |
| Error messages connected to fields. | Verified | Component inspection. |
| Focus moves after step navigation. | Verified | Playwright and focus fix. |
| Focus returns after summary edit. | Verified | Playwright assertion. |
| Dialog focus trap. | Verified | Playwright Tab loop assertion. |
| Dialog Escape support. | Verified | Playwright Escape assertion. |
| Axe first-step smoke test. | Verified | Playwright axe test. |
| 200% zoom. | Implemented but unverified | No dedicated zoom automation in this pass. |
| Reduced motion. | Implemented but unverified | No dedicated reduced-motion automation in this pass. |

## Responsive

| Viewport | Status | Evidence |
| --- | --- | --- |
| 1440 x 900 | Verified | Playwright no-overflow test. |
| 1280 x 800 | Verified | Playwright no-overflow test. |
| 1024 x 768 | Verified | Playwright no-overflow test. |
| 768 x 1024 | Verified | Playwright no-overflow test. |
| 390 x 844 | Verified | Playwright no-overflow test. |
| 360 x 800 | Verified | Playwright no-overflow test. |

## Security And Authorization

| Requirement | Status | Evidence |
| --- | --- | --- |
| Anonymous users cannot create persisted event plans. | Verified | Event-plan action tests. |
| Customer-only ownership is enforced in repository methods. | Verified | Event-plan repository tests. |
| RLS policies exist for event_plans. | Verified | Migration test and database contract validator. |
| Raw Supabase/RLS errors are hidden. | Verified | Event-plan action tests. |
| Live Customer A vs Customer B browser denial. | Implemented but unverified | Not completed in browser. |
| Live venue owner/supplier/coordinator denial. | Implemented but unverified | Not completed in browser. |
| Service role not exposed to client. | Verified | Code inspection and action/repository pattern. |

## Final Validation

| Check | Status | Evidence |
| --- | --- | --- |
| Event-planning unit tests. | Verified | 58/58 passed. |
| Event-planning browser tests. | Verified | 12/12 passed. |
| Relevant auth tests. | Verified | 15/15 passed. |
| Relevant venue-search tests. | Verified | 5/5 passed. |
| Event-plan RLS/ownership contracts. | Verified | 19/19 passed plus database contract pass. |
| `pnpm --filter @venora/web type-check`. | Verified | Passed. |
| `pnpm --filter @venora/web build`. | Verified | Passed. |
| Conflict marker scan. | Verified | `git grep -n -E "^(<<<<<<<|=======|>>>>>>>)"` returned no matches. |
| `git diff --check`. | Verified | Passed with only Windows line-ending warnings. |
| Clean working tree after commit. | Verified | `git status --short` returned no changes after commit. |

## Release Readiness

Status: Implemented but browser verification incomplete.

Ready for Task 21 documentation and release validation with one caveat: complete the live authenticated browser matrix before calling Phase 1 fully release-verified.
