# Immersive Venue Experience Release Validation

## Release Scope

Branch: `release/immersive-venue-experience`

This document records the Phase 2.10B release-gate closure attempt for the immersive public venue profile.

Validated surfaces:

- Public `/venues/[slug]` cinematic profile.
- Legacy venue fallback.
- Draft-only venue public fallback.
- Published structured venue rendering.
- Venue-owner structured editor route.
- Cross-role draft/RLS boundaries.
- Public reviews, packages, gallery, logistics, FAQs, save/share, inquiry, availability, booking surfaces.
- Local Supabase/RLS behavior.

Deferred modules remain out of scope: accommodations, dining, event showcases, floor plans, property maps, 360 tours, hotspots, site visits, and advanced recommendation ranking.

## Environment

- Repository: `C:\venora`
- Branch: `release/immersive-venue-experience`
- Local app: `http://127.0.0.1:3000`
- Local Supabase API: `http://127.0.0.1:54321`
- Local Supabase DB: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- Browser tooling: Playwright CLI
- Disposable screenshot directory: `C:\tmp\venora-210b-screens`

Safety result:

- `apps/web/.env` and `apps/web/.env.local` were pointed at local Supabase only.
- Hosted Supabase URLs were not used for release-gate fixture work.
- No secrets were committed.
- Disposable fixture records and auth users were cleaned up.

## Local Supabase Setup Notes

Docker and Supabase were available, but the local database has historical migration drift.

Observed drift:

- `supabase migration up` could not be used normally because local migration history contains remote/local version mismatches.
- The release gate did not repair migration history.
- Committed structured venue and coordinator dependency SQL was applied directly to the local default DB for verification only.
- Existing committed grants had to be restored locally because several public-route tables had RLS policies but lacked runtime `SELECT` grants in this local DB.

Local-only grants restored during QA:

- `venues`
- `venue_images`
- `venue_packages`
- `venue_amenities`
- `amenities`
- `venue_event_types`
- `event_types`
- `venue_category_assignments`
- `venue_categories`
- `organizations`
- `profiles`
- `user_roles`
- `reviews`
- `review_photos`
- `favorites`
- `notifications`

These were local verification repairs only; no migration files were changed.

## Disposable Rich Structured Venue

A local-only disposable fixture was created with:

- 3 published spaces: Glass Garden Hall, Sunset Lawn, Courtyard Pavilion.
- 1 draft-only private space: Private Draft Studio.
- Multiple capacity layouts.
- Space amenities.
- Space event types.
- Grouped venue and space media using local static app images.
- 2 published packages and package-space relationships.
- Logistics.
- FAQs.
- Owner A, Owner B, assigned coordinator, unassigned/wrong coordinator, customer, supplier, and admin test users.

Cleanup result:

- Fixture venues remaining: `0`
- Fixture auth users remaining: `0`

## RLS Result

Status: passed.

Command:

`pnpm --filter @venora/web exec node C:\tmp\venora-210b-fixture.mjs rls`

Result:

- Owner could read own draft.
- Other owner could not read draft.
- Public/authenticated users could read published spaces.
- Customer, supplier, anonymous user could not read draft revision.
- View-only coordinator could not write.
- Wrong/unassigned coordinator could not read draft.
- Coordinator could not publish.
- Cross-venue package-space relationship was rejected.

## Public Legacy Result

Status: partially verified.

Evidence:

- `/venues/amorita-resort` rendered the expected legacy venue heading.
- Draft-only fixture public route rendered its legacy venue heading.
- Draft-only structured content did not appear publicly.

Blocker:

- Console captured repeated `401 Unauthorized` resource failures during public route verification.
- This prevents classifying browser verification as clean.

## Published Structured Browser Result

Status: failed release gate.

Evidence:

- The rich structured venue did render structured section content during Playwright inspection.
- The failure trace resolved multiple visible `Glass Garden Hall` occurrences across legitimate immersive sections, proving space explorer / journey / package contexts were present.
- Screenshots were captured at several sizes before the run timed out:
  - `rich-1440x900.png`
  - `rich-1280x800.png`
  - `rich-1024x768.png`
  - `rich-768x1024.png`
  - `rich-430x932.png`
  - `rich-390x844.png`

Blockers:

- Full seven-viewport rich structured browser verification timed out.
- Public route emitted React hydration mismatch warnings.
- Hydration mismatch evidence pointed at client/server differences in form-control inline styles such as `caret-color: transparent`.
- Because hydration warnings were present, this release gate must stop instead of certifying the page.

## Authenticated Browser Matrix Result

Status: failed release gate.

Evidence:

- Owner login reached venue-owner dashboard content after local `user_roles` grants were restored.
- Owner/editor route began loading for the disposable venue.

Blockers:

- The authenticated editor matrix timed out.
- Login helper later timed out waiting for `#login-email`, likely after dev-server instability caused by the same long-running browser pass.
- Venue-owner dashboard also emitted React hydration mismatch warnings involving `MaterialIcon` server/client style differences and icon text visibility.

## Accessibility Result

Status: not release-certified.

Reason:

- Browser verification stopped on hydration/timeouts before completing the required full responsive accessibility pass.
- No screen-reader or 200% zoom pass was performed in this run.

## Performance and Lighthouse Result

Status: not run in this closure attempt.

Reason:

- Browser gate found hydration/timeouts first.
- Per stop conditions, Lighthouse/LCP verification was not expanded after a browser release blocker was discovered.

## Automated Regression Result

Status: not rerun in this closure attempt.

Reason:

- The task stop condition says to stop and report when a code defect is discovered instead of expanding scope.
- Browser hydration mismatch and release-gate browser timeouts were found before the final automated regression batch.

Previously recorded successful checks remain useful context but are not fresh Phase 2.10B closure evidence.

## Protected Scope Confirmation

Unchanged:

- `package.json`
- `pnpm-lock.yaml`
- Supabase migration files
- Application source files
- Tests after temporary Playwright spec removal

Temporary files:

- A temporary Playwright spec was created and removed.
- Disposable SQL/fixture scripts remained in `C:\tmp` only and were not committed.
- No disposable fixture DB rows or auth users remain.

## Release Decision

Classification: partial, not release-ready.

Release blockers:

- Rich structured public venue browser matrix timed out.
- Public route emitted React hydration mismatch warnings.
- Venue-owner dashboard emitted React hydration mismatch warnings.
- Public routes emitted unauthenticated `401` console noise.
- Authenticated cross-role browser matrix did not complete.
- Lighthouse/LCP verification did not run after the blocker was found.

Non-blocking context:

- Local RLS contract for the disposable structured venue passed.
- Local rich structured fixture proved structured sections can render.
- Legacy and draft-only public fallback did not expose draft-only structured text before browser verification stopped.

## Next Required Fixes

Before release-ready classification:

- Fix hydration mismatch in public venue package compare / booking controls.
- Fix hydration mismatch in dashboard `MaterialIcon` rendering.
- Identify and eliminate unauthenticated public-route `401` console requests or explicitly gate those calls.
- Rerun the rich structured browser matrix at all required viewports.
- Rerun authenticated owner/coordinator/customer/supplier/browser matrix.
- Run Lighthouse or equivalent mobile/desktop performance checks.
- Run final fresh type-check, build, focused tests, conflict-marker scan, and diff checks.

## Phase 2.10C Browser Blocker Repair Update

Branch: `fix/immersive-release-browser-blockers`

Status: partial, not release-ready.

### Root Causes Confirmed

- Anonymous public venue `401` noise came from public/customer booking widgets mounting `useCalendar()` with owner-level monthly reads. The hook queried `bookings` with customer/profile/package joins and `venue_availability` on anonymous public routes before a customer selected a date.
- Dashboard `MaterialIcon` hydration mismatch came from client-only font readiness state. Server markup rendered hidden icon text, while the first client render could render visible icon text after the module-level font flag changed.
- The screenshot venue `/venues/amorita-resort` is legacy mode in the current local database. It has no published structured revision, no published spaces, no grouped structured media, no structured logistics, and no structured FAQs. Missing immersive structured sections on that venue are expected for legacy fallback.
- The previous rich structured fixture had already been cleaned up. A new local-only disposable fixture was needed to verify structured rendering.

### Fixes Applied

- `useCalendar()` now accepts explicit options to disable availability reads, booking reads, and realtime subscriptions for public/customer contexts.
- Public venue booking sidebar and customer booking workflow now use `useCalendar()` without protected monthly prefetch. Date submission still goes through the existing availability/booking validation path.
- Public booking helper copy now says availability is confirmed before booking/request submission instead of claiming a full blocked-date list is loaded.
- `MaterialIcon` now renders deterministic markup without font-readiness visibility state.
- The Material Symbols stylesheet uses `display=block` to reduce raw icon text flash while keeping deterministic React markup.

### Regression Coverage Added

- `apps/web/e2e/immersive-release-blockers.spec.ts`
  - Opens anonymous `/venues/amorita-resort`.
  - Fails on hydration warnings.
  - Fails on unexpected anonymous `401` responses.
  - Confirms the public venue still renders.
- `apps/web/src/components/dashboard/enterprise/MaterialIcon.test.tsx`
  - Confirms MaterialIcon server markup contains the icon text and class.
  - Confirms it no longer emits `visibility` state that can differ during hydration.

### Focused Results

- Public anonymous blocker test: passed.
- MaterialIcon regression test: passed.
- Rich structured local fixture created with:
  - 1 published structured revision.
  - 3 published spaces.
  - 3 published media collections.
  - 4 published media items.
  - 2 active packages.
  - 3 published FAQs.
- Rich structured browser matrix checked at:
  - `1440x900`
  - `1280x800`
  - `1024x768`
  - `768x1024`
  - `430x932`
  - `390x844`
  - `360x800`
- Rich structured matrix result:
  - Heading rendered.
  - Space explorer content rendered.
  - Package content rendered.
  - FAQ content rendered.
  - No horizontal overflow.
  - No failed HTTP responses.
  - No page errors.
  - No React hydration warnings captured.
- Disposable fixture cleanup result:
  - Fixture venues remaining: `0`.

### Remaining Browser Warnings

The rich structured matrix still emitted non-hydration console warnings:

- Repeated `Expected value to be of type number, but found null instead.`
- Mobile-only Next image LCP hint for the rich fixture hero image.

These were not the original hydration or anonymous `401` blockers, but they must be investigated before a release-ready classification.

### Verification Commands

- `pnpm --filter @venora/web test -- src/components/dashboard/enterprise/MaterialIcon.test.tsx`: passed.
- `playwright test e2e/immersive-release-blockers.spec.ts --project=chromium --reporter=line`: passed.
- `pnpm --filter @venora/web type-check`: passed.
- `pnpm --filter @venora/web build`: passed.
- `git grep -n -E "^(<<<<<<<|=======|>>>>>>>)"`: clean.
- `git diff --check`: clean, with Windows line-ending warnings only.

### Still Not Release-Ready

Not completed in Phase 2.10C:

- Authenticated owner/coordinator/customer/supplier browser matrix.
- Dashboard browser verification after login, because the local seeded `owner@venora.local` password login failed in the clean Playwright context.
- Root-cause investigation for the remaining rich-route `Expected value to be of type number, but found null instead.` warnings.
- Lighthouse and measured LCP.
- Full release regression batch.

The release remains `partial, not release-ready` until those checks pass.
