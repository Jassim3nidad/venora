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
