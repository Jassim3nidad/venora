# Structured Venue Foundation Implementation Plan

Goal:
Create the secure structured-data foundation for venue spaces, grouped media, logistics, FAQs, publication, and package-space relationships without redesigning the owner or public interfaces.

Architecture:
Use `venue_profile_revisions` as the Draft -> Preview -> Published container. Store spaces, layouts, space amenities, space event types, grouped media, logistics, FAQs, and package-space relationships as normalized rows tied to a revision and venue. Public pages keep current behavior unless a published structured revision exists. Owners and assigned coordinators manage drafts through server-derived authorization. Public reads expose only published structured content.

Batch E status, 2026-07-31:

- Task 12: complete. Structured table types were added to `packages/database/types/generated.ts` using the repository's hand-maintained generated-type convention because the local generator could not be safely run.
- Task 13: complete. Backward-compatibility repository contracts were added for no revision, draft-only, published, archived, package fallback, media fallback, no automatic draft creation, and sanitized errors.
- Task 14: blocked. Local Supabase/Docker could not be started because the Docker Desktop Linux engine pipe was unavailable, so live RLS verification remains incomplete.
- Task 15: partial. Foundation, access-control, and QA verification docs were added, but Phase 2.2 must not be classified as live verified until Task 14 passes.

Tech stack:
Next.js, TypeScript, Zod, Supabase PostgreSQL, Supabase RLS, Supabase Storage, Vitest or the repository's existing test framework.

Global constraints:

- No new packages unless separately approved.
- No unrelated refactors.
- Preserve existing venue behavior.
- Customer Event Planning remains unchanged.
- Existing venue pages remain backward compatible.
- Ownership is server-derived.
- RLS is mandatory.
- Coordinators are assignment- and permission-scoped.
- No fake public content.
- No arbitrary external embeds.
- One focused commit per task.

## Implementation Tasks

### Task 1 - Domain Types and Controlled Values

Goal:
Define TypeScript domain contracts and controlled values for structured venue content.

Files to create:

- `apps/web/src/features/venues/domain/structured-venue.types.ts`

Files to modify:

- None unless existing barrel exports are used in this feature area.

Tests to create:

- `apps/web/src/features/venues/domain/structured-venue.types.test.ts` only if existing type/value tests use runtime guards.

Interfaces consumed:

- Existing venue, package, amenity, event-type, and coordinator permission concepts.

Interfaces produced:

- `VenueProfileRevisionStatus`
- `VenueSpaceSetting`
- `VenueSpaceType`
- `VenueSpaceLayout`
- `VenueMediaCollectionType`
- `VenueStructuredMediaType`
- `VenueMediaProvider`
- `VenueStructuredContentStatus`
- `VenueFaqCategory`
- `PackageVenueSpaceInclusionType`
- Draft and published profile DTO shapes.

TDD sequence:

1. Add controlled-value arrays and TypeScript union types.
2. Add helper guards for values that need runtime checking.
3. Add type-level DTOs for draft and published profiles.
4. Run focused type/value tests if runtime guards exist.

Verification commands:

- `pnpm --filter @venora/web test -- structured-venue.types`
- `pnpm --filter @venora/web type-check`

Security review:

- Types must distinguish draft/private data from published/public DTOs.

Stop conditions:

- Existing generated database types conflict with planned names.
- Existing feature already defines equivalent structured venue types.

Commit message:

- `feat(venues): add structured venue domain types`

Exit criteria:

- Domain values are defined once and reused by later validation/repository tasks.

### Task 2 - Zod Validation Contracts

Goal:
Create validation schemas for every structured venue mutation.

Files to create:

- `apps/web/src/features/venues/schemas/structured-venue.schema.ts`
- `apps/web/src/features/venues/schemas/structured-venue.schema.test.ts`

Files to modify:

- None unless schema barrel exports exist.

Tests to create:

- Validation tests for names, slugs, capacities, layouts, amenities, event types, media URLs, captions, alt text, FAQs, logistics, publication transitions, and package-space relationships.

Interfaces consumed:

- Task 1 domain values.

Interfaces produced:

- `createVenueSpaceSchema`
- `updateVenueSpaceSchema`
- `reorderVenueSpacesSchema`
- `capacityLayoutsSchema`
- `spaceAmenitiesSchema`
- `spaceEventTypesSchema`
- `mediaCollectionSchema`
- `mediaItemSchema`
- `venueLogisticsSchema`
- `venueFaqSchema`
- `packageVenueSpacesSchema`
- `publishStructuredVenueProfileSchema`

TDD sequence:

1. Write failing validation cases for each schema.
2. Implement schemas using Task 1 controlled values.
3. Add boundary cases for max lengths and capacity limits.
4. Add external URL tests for HTTPS and provider allowlist.
5. Add same-venue package-space validation hook placeholder for server-side repository checks.

Verification commands:

- `pnpm --filter @venora/web test -- structured-venue.schema`
- `pnpm --filter @venora/web type-check`

Security review:

- Reject raw HTML and non-HTTPS external URLs.
- Do not accept `userId`, `organizationId`, role, or permission from browser payloads.

Stop conditions:

- Schema needs a new dependency.
- Product wants rich text in MVP.

Commit message:

- `feat(venues): add structured venue validation`

Exit criteria:

- All mutation payloads have Zod contracts before server actions exist.

### Task 3 - Core Venue-Space Migration

Goal:
Create revision and venue-space tables with constraints, indexes, and baseline RLS.

Files to create:

- `supabase/migrations/[timestamp]_structured_venue_foundation_core.sql`
- Migration contract test file following existing database-test conventions.

Files to modify:

- No application source in this task.

Tests to create:

- Static migration tests for table names, required columns, constraints, and indexes.

Interfaces consumed:

- Approved design document.
- Existing `venues`, `profiles`, `organization_members`, and ownership helper functions.

Interfaces produced:

- `venue_profile_revisions`
- `venue_spaces`

TDD sequence:

1. Write static migration tests for table creation.
2. Add migration with `venue_profile_revisions`.
3. Add migration with `venue_spaces`.
4. Add partial unique constraints for one draft and one published revision per venue.
5. Add venue-scoped space uniqueness.
6. Add indexes.
7. Add baseline RLS policies for public published select and owner/admin management.

Verification commands:

- Available database contract tests for migrations.
- `git grep -n -E "^(<<<<<<<|=======|>>>>>>>)"`

Security review:

- Public policy must not reveal draft revisions or draft spaces.
- Owner writes must derive through `venues.organization_id`.

Stop conditions:

- Existing migration drift prevents local apply.
- Existing helper functions cannot express ownership safely.

Commit message:

- `feat(venues): add structured venue core schema`

Exit criteria:

- Core tables exist in migration and static tests cover required shape.

### Task 4 - Capacity Layout and Taxonomy Relationships

Goal:
Add space capacity-layout rows and reusable amenity/event-type joins.

Files to create:

- `supabase/migrations/[timestamp]_structured_venue_space_relationships.sql`
- Database contract tests for relationship tables.

Files to modify:

- None outside migrations/tests.

Tests to create:

- Table/constraint/index tests.
- Same-space duplicate relationship tests if local DB is available.

Interfaces consumed:

- Task 3 tables.
- Existing `amenities`.
- Existing `event_types`.

Interfaces produced:

- `venue_space_capacity_layouts`
- `venue_space_amenities`
- `venue_space_event_types`

TDD sequence:

1. Write static tests for expected tables and constraints.
2. Add capacity-layout table with layout check.
3. Add space-amenity join to existing `amenities`.
4. Add space-event-type join to existing `event_types`.
5. Add RLS policies inherited through parent space/revision.
6. Add indexes for space, layout, capacity, amenity, and event type.

Verification commands:

- Available migration/static database tests.
- Local migration apply when database is available.

Security review:

- Child relationship policies must not bypass parent draft restrictions.
- Joins must not allow cross-venue relationship insertion.

Stop conditions:

- Existing taxonomy table names differ from Phase 2.1 evidence.
- FK constraints cannot enforce same-venue expectations cleanly.

Commit message:

- `feat(venues): add venue space relationships`

Exit criteria:

- Spaces can have validated capacities, amenities, and event types.

### Task 5 - Grouped Media Foundation

Goal:
Add grouped media tables while preserving existing `venue_images`.

Files to create:

- `supabase/migrations/[timestamp]_structured_venue_media.sql`
- Database contract tests for media collections/items.

Files to modify:

- None outside migrations/tests.

Tests to create:

- Static tests for collection/item constraints.
- URL validation tests remain in Task 2.

Interfaces consumed:

- Existing `venue-images` bucket.
- Existing `venue_images`.
- Existing media upload path convention.

Interfaces produced:

- `venue_media_collections`
- `venue_media_items`

TDD sequence:

1. Write static tests for tables and constraints.
2. Add media collection table.
3. Add media item table.
4. Add optional `legacy_venue_image_id`.
5. Add checks for media type, provider, moderation status, and storage/external exclusivity.
6. Add RLS policies inherited from revision/venue.
7. Add indexes for collection ordering and item ordering.

Verification commands:

- Available migration/static database tests.
- `git diff --check`

Security review:

- No raw iframe HTML columns.
- External URL storage must be bounded by validation and checks.
- Storage path ownership remains enforced in server actions and Storage policies.

Stop conditions:

- Product requests floor plans or 360 tour implementation in this task.
- Existing storage policy cannot support grouped media safely.

Commit message:

- `feat(venues): add grouped venue media schema`

Exit criteria:

- Grouped images and stored video records can be modeled without replacing current gallery.

### Task 6 - Structured Logistics and FAQs

Goal:
Add structured practical information and venue FAQs.

Files to create:

- `supabase/migrations/[timestamp]_structured_venue_logistics_faqs.sql`
- Database contract tests for logistics/FAQs.

Files to modify:

- None outside migrations/tests.

Tests to create:

- Static tests for columns, constraints, and indexes.

Interfaces consumed:

- Task 3 revision table.

Interfaces produced:

- `venue_logistics`
- `venue_faqs`

TDD sequence:

1. Write static table/column tests.
2. Add `venue_logistics` with one row per revision.
3. Add `venue_faqs` with display order and category.
4. Add RLS policies inherited through revision.
5. Add indexes for revision, display order, weather backup, and parking capacity.

Verification commands:

- Available migration/static database tests.

Security review:

- Fields must be public-planning information only.
- No sensitive owner or staff data.
- FAQ text remains plain text.

Stop conditions:

- Stakeholders request rich text or private notes in logistics/FAQs.

Commit message:

- `feat(venues): add venue logistics and faqs`

Exit criteria:

- Public practical information can be stored as structured data.

### Task 7 - Publication and Public-Read Policies

Goal:
Complete publication helpers, RLS policies, and transactional publish behavior at the database level.

Files to create:

- `supabase/migrations/[timestamp]_structured_venue_publication_policies.sql`
- RLS test file following repository database-test conventions.

Files to modify:

- Prior structured venue migration tests if policy names are refined.

Tests to create:

- Anonymous can select published only.
- Customer can select published only.
- Owner can select/write own drafts.
- Assigned coordinator can select/write assigned drafts only with permission.
- Unassigned coordinator is denied.
- Supplier cannot access drafts.
- Admin can manage all.

Interfaces consumed:

- Tasks 3-6 tables.
- `organization_members.permissions`.
- `venue_coordinator_assignments`.
- Existing role/admin helpers.

Interfaces produced:

- Optional helper functions:
  - `public.can_manage_venue_structured_content(p_venue_id uuid)`
  - `public.can_preview_venue_structured_content(p_venue_id uuid)`
  - `public.can_publish_venue_structured_content(p_venue_id uuid)`

TDD sequence:

1. Write RLS tests for every role.
2. Add or refine helper functions.
3. Add select/insert/update/delete policies.
4. Add publish helper only if server transaction needs database assistance.
5. Verify no draft rows leak through public policies.

Verification commands:

- Eventual RLS test command selected from repository scripts.
- Local Supabase database tests when available.

Security review:

- Coordinator role alone must not pass.
- Public read path must require published revision.
- Admin access should match existing admin patterns.

Stop conditions:

- Existing local migration drift prevents reliable RLS verification.
- Coordinator permission data cannot be safely checked inside RLS.

Commit message:

- `feat(venues): secure structured venue publication`

Exit criteria:

- Public/draft data boundaries are enforced in database policies.

### Task 8 - Package-to-Space Relationships

Goal:
Connect existing venue packages to structured spaces without changing pricing.

Files to create:

- `supabase/migrations/[timestamp]_package_venue_spaces.sql`
- Database contract tests for package-space relationships.

Files to modify:

- None outside migrations/tests.

Tests to create:

- Same-venue relationship allowed.
- Cross-venue relationship rejected.
- Duplicate package-space relationship rejected.
- Public reads only published space relationships.

Interfaces consumed:

- `venue_packages`.
- `venue_spaces`.

Interfaces produced:

- `package_venue_spaces`

TDD sequence:

1. Write migration/static tests.
2. Add table with FKs and same-venue validation strategy.
3. Add indexes.
4. Add RLS policies inherited through package/venue and published space revision.
5. Add contract tests.

Verification commands:

- Available migration/static database tests.

Security review:

- Relationship cannot imply price changes.
- Relationship cannot point to a space from another venue.

Stop conditions:

- Existing package model changes in parallel.

Commit message:

- `feat(venues): connect packages to venue spaces`

Exit criteria:

- Packages can reference included, optional, or upgrade spaces.

### Task 9 - RLS and Role Authorization Tests

Goal:
Create focused authorization coverage across all structured tables.

Files to create:

- Database/RLS tests under the repository's existing test convention.
- `apps/web/src/features/venues/application/structured-profile-authorization.test.ts`

Files to modify:

- None outside test files.

Tests to create:

- Owner manages owned venue structured data.
- Owner cannot manage another owner venue.
- Assigned coordinator with permission can edit assigned draft.
- Assigned coordinator without permission cannot edit.
- Coordinator assigned to different venue cannot edit.
- Coordinator cannot publish by default.
- Customer, supplier, anonymous cannot mutate.
- Public only sees published revision.

Interfaces consumed:

- Tasks 3-8 migrations.
- Existing coordinator permission helpers.

Interfaces produced:

- Reusable test fixtures for Task 10 and Task 11.

TDD sequence:

1. Add authorization helper tests around existing permission checks.
2. Add RLS matrix tests.
3. Confirm all proposed tables are covered.
4. Record unavailable database verification if local database cannot apply migrations.

Verification commands:

- Focused RLS/database tests.
- Focused Vitest authorization tests.

Security review:

- This task is a gate before repositories/actions.

Stop conditions:

- Any public draft leak.
- Any unassigned coordinator mutation allowed.

Commit message:

- `test(venues): verify structured venue access control`

Exit criteria:

- Authorization matrix is covered before application repositories ship.

### Task 10 - Repositories

Goal:
Create server-side repository methods for draft, published, space, media, logistics, FAQ, and package-space operations.

Files to create:

- `apps/web/src/features/venues/application/structured-profile-repository.ts`
- `apps/web/src/features/venues/application/structured-profile-repository.test.ts`

Files to modify:

- Existing venue application barrel exports if present.

Tests to create:

- Repository success and failure tests for every contract.
- Query-shaping tests for public published profile.
- Backward-compatible null return when no published revision exists.

Interfaces consumed:

- Generated database types from Task 12 when available; temporary typed aliases may be used before generation only if the task sequence requires it.
- Task 2 validation outputs.
- Tasks 3-8 tables.

Interfaces produced:

- Repository methods listed in the design spec.

TDD sequence:

1. Write tests for `findPublishedRevisionForVenue` returning null safely.
2. Implement revision repository.
3. Add space CRUD/reorder/archive.
4. Add capacity/amenity/event-type replacement methods.
5. Add media collection/item methods.
6. Add logistics and FAQ methods.
7. Add package-space methods.
8. Add published profile aggregate query.

Verification commands:

- `pnpm --filter @venora/web test -- structured-profile-repository`
- `pnpm --filter @venora/web type-check`

Security review:

- Repository methods must require caller-provided validated context.
- Repository methods should not trust browser-provided ownership fields.

Stop conditions:

- Generated types are unavailable and unsafe `any` spreads across repository implementation.
- Public query requires broad select policy that would expose drafts.

Commit message:

- `feat(venues): add structured venue repository`

Exit criteria:

- Server code can read/write structured venue data through one tested repository layer.

### Task 11 - Server Actions

Goal:
Expose validated server actions for later owner-editor consumption.

Files to create:

- `apps/web/src/features/venues/application/structured-profile-actions.ts`
- `apps/web/src/features/venues/application/structured-profile-actions.test.ts`

Files to modify:

- Revalidation helpers if existing shared helper exists.

Tests to create:

- Auth required.
- Ownership required.
- Coordinator assignment and permission required.
- Safe errors.
- Revalidation paths called.
- Publish blocks incomplete content.

Interfaces consumed:

- Task 2 schemas.
- Task 10 repository.
- Existing auth/server Supabase helper.
- Existing coordinator permission helpers.

Interfaces produced:

- Server actions listed in the design spec.

TDD sequence:

1. Write tests for unauthenticated rejection.
2. Write owner success tests.
3. Write assigned coordinator success tests for draft edit.
4. Write coordinator publish denial.
5. Implement server-side context resolver.
6. Wire Zod validation and repository calls.
7. Add route revalidation.
8. Add safe error mapping.

Verification commands:

- `pnpm --filter @venora/web test -- structured-profile-actions`
- `pnpm --filter @venora/web type-check`

Security review:

- Never accept `userId`, role, permission, or organization ID from input.
- No service role client in UI-facing actions.

Stop conditions:

- Existing auth helper cannot resolve current user server-side.
- Any test requires broad coordinator access.

Commit message:

- `feat(venues): add structured venue actions`

Exit criteria:

- Later UI can manage structured drafts through secure actions.

### Task 12 - Generated Database Types

Goal:
Update generated Supabase database types after migrations are validated.

Files to create:

- None expected.

Files to modify:

- Generated database types file used by the web app.

Tests to create:

- None unless type-generation scripts have tests.

Interfaces consumed:

- Applied local migrations from Tasks 3-8.

Interfaces produced:

- Typed `Database["public"]["Tables"]` entries for all new tables.

TDD sequence:

1. Confirm local database is running and migrations apply.
2. Run the repository's existing type generation command.
3. Review generated diff for only expected table/type additions.
4. Run focused type-check.

Verification commands:

- Repository's actual type generation command.
- `pnpm --filter @venora/web type-check`

Security review:

- Generated types should not introduce source logic.

Stop conditions:

- Local database cannot apply migrations.
- Generated diff includes unrelated schema drift.

Commit message:

- `chore(types): update structured venue database types`

Exit criteria:

- TypeScript can consume structured venue tables without unsafe fallbacks.

### Task 13 - Backward-Compatibility Integration Contracts

Goal:
Add non-UI integration contracts proving existing public venue behavior remains safe.

Files to create:

- `apps/web/src/features/venues/application/structured-profile-compatibility.test.ts`

Files to modify:

- Minimal query integration point only if necessary; no public redesign.

Tests to create:

- Venue with no published revision returns null structured profile.
- Venue with draft only returns null for public profile.
- Venue with published revision returns shaped structured profile.
- Existing package and media fallbacks remain valid.

Interfaces consumed:

- Task 10 public repository method.

Interfaces produced:

- Contract for Phase 2.4 public page integration.

TDD sequence:

1. Write null published profile tests.
2. Write published profile shape tests.
3. Add minimal compatibility helper if needed.
4. Avoid changing `VenueDetails` UI.

Verification commands:

- `pnpm --filter @venora/web test -- structured-profile-compatibility`
- `pnpm --filter @venora/web type-check`

Security review:

- Public helper must not include draft fields.

Stop conditions:

- Any required change redesigns public venue page.

Commit message:

- `test(venues): protect structured venue compatibility`

Exit criteria:

- Later public page work has a safe data contract.

### Task 14 - Live Local Database and RLS Verification

Goal:
Apply migrations locally and verify RLS behavior against real Supabase.

Files to create:

- `docs/qa/structured-venue-foundation-verification.md`

Files to modify:

- None outside QA docs unless verification reveals doc mismatch.

Tests to create:

- No new tests unless verification reveals missing coverage.

Interfaces consumed:

- Tasks 3-13.

Interfaces produced:

- Local verification report.

TDD sequence:

1. Start local Supabase.
2. Apply migrations through the repository workflow.
3. Run RLS matrix checks.
4. Run focused repository/action tests against local DB if available.
5. Record all commands and results.
6. Record any known local migration drift separately.

Verification commands:

- `supabase start`
- Repository migration apply command.
- Focused database/RLS test commands.
- `git grep -n -E "^(<<<<<<<|=======|>>>>>>>)"`

Security review:

- Treat this task as a release gate for structured data foundation.

Stop conditions:

- Migration drift prevents trustworthy verification.
- RLS matrix fails.

Commit message:

- `docs(venues): record structured venue verification`

Exit criteria:

- Local database and RLS verification is documented with command results.

### Task 15 - Documentation and Final Foundation Validation

Goal:
Finalize implementation documentation and validate the foundation before Phase 2.3.

Files to create:

- `docs/features/structured-venue-foundation.md`
- `docs/security/structured-venue-access-control.md`

Files to modify:

- `docs/specs/structured-venue-foundation-design.md`
- `docs/plans/structured-venue-foundation-implementation.md`
- `docs/qa/structured-venue-foundation-verification.md`

Tests to create:

- None expected.

Interfaces consumed:

- Final implemented tables, repositories, actions, and verification reports.

Interfaces produced:

- Phase 2.2 completion docs.

TDD sequence:

1. Update design document with any approved deviations.
2. Document implemented access control.
3. Document migration and rollback strategy.
4. Run final focused verification commands.
5. Confirm no unrelated files changed.

Verification commands:

- `pnpm --filter @venora/web type-check`
- Focused structured venue tests.
- Focused RLS/database tests.
- `git diff --check`
- `git grep -n -E "^(<<<<<<<|=======|>>>>>>>)"`

Security review:

- Verify docs match actual RLS and server-action behavior.

Stop conditions:

- Unverified RLS behavior.
- Public draft leak.
- Existing venue page regression.

Commit message:

- `docs(venues): finalize structured venue foundation`

Exit criteria:

- Phase 2.2 can be handed to Phase 2.3 owner-editor design and implementation.

## Plan Execution Batches

### Batch A - Tasks 1-2

- Scope: domain and validation.
- Dependencies: stakeholder approval for this design.
- Expected files: domain types and Zod schemas/tests.
- Verification gate: focused tests and type-check.
- Stop conditions: dependency needed, value names conflict, rich text requested.
- Database access required: no.

### Batch B - Tasks 3-4

- Scope: core schema and space relationships.
- Dependencies: Batch A contracts.
- Expected files: migrations and migration tests.
- Verification gate: static migration tests and local migration apply when available.
- Stop conditions: migration drift, ownership helper conflict.
- Database access required: yes for full verification.

### Batch C - Tasks 5-8

- Scope: grouped media, logistics, publication policies, package-space links.
- Dependencies: Batch B tables.
- Expected files: migrations and database tests.
- Verification gate: RLS/database tests for public/draft boundary and package-space integrity.
- Stop conditions: external embed policy dispute, package model conflict, storage policy gap.
- Database access required: yes.

### Batch D - Tasks 9-11

- Scope: security tests, repositories, server actions.
- Dependencies: Batches A-C and generated or temporary database types.
- Expected files: tests, repository, actions.
- Verification gate: focused Vitest tests, RLS tests, type-check.
- Stop conditions: coordinator authorization ambiguity, public draft leak.
- Database access required: preferred for RLS, not required for isolated unit tests.

### Batch E - Tasks 12-15

- Scope: generated types, compatibility contracts, live verification, final docs.
- Dependencies: Batches A-D.
- Expected files: generated types, compatibility tests, QA/security/feature docs.
- Verification gate: type-check, focused tests, local DB/RLS verification, conflict-marker scan.
- Stop conditions: generated type drift, local migration drift blocks RLS confidence.
- Database access required: yes.

Do not execute all batches in one Codex run. Each batch should produce reviewable commits and pause for review when database or security behavior changes.

## Open-Decision Handling

### Coordinator publishing

- Question: can assigned coordinators publish structured venue revisions?
- Recommended default: no; coordinators can edit drafts with `manage_assigned_venue_listings`, while owners/admins publish.
- Consequence if yes: add explicit permission such as `publish_assigned_venue_listings` and test it in RLS/server actions.
- Consequence if no: owner approval remains required for public changes.
- Blocks implementation: no.
- Latest decision point: before Task 7 if database helper/policies include publish permissions.

### Text richness

- Question: should FAQs/logistics/descriptions support rich text?
- Recommended default: plain text for MVP.
- Consequence if rich text: sanitizer, editor constraints, rendering tests, and XSS tests become required.
- Consequence if plain text: simpler and safer, less formatting flexibility.
- Blocks implementation: no.
- Latest decision point: before Task 2 validation finalization.

### External video providers

- Question: which providers are approved for `external_video`?
- Recommended default: start with none or a minimal allowlist approved by product/security; uploaded video already exists.
- Consequence of broad allowlist: greater XSS/broken embed risk.
- Consequence of no external providers: grouped media still works with uploaded images/video.
- Blocks implementation: no.
- Latest decision point: before Task 5 media constraints.

### Admin moderation

- Question: should structured media or public text require admin moderation?
- Recommended default: no moderation for basic owner-authored spaces/logistics/FAQs; include `moderation_status` for future media/showcases.
- Consequence if required now: owner publishing workflow becomes slower and admin UI is needed.
- Consequence if deferred: owner-published content needs audit and abuse reporting later.
- Blocks implementation: no.
- Latest decision point: before Phase 2.3 publish UI.

### Publication revision retention

- Question: how many archived revisions should be retained?
- Recommended default: retain archived revisions indefinitely for MVP, then add retention policy later.
- Consequence if short retention: less storage, weaker audit/history.
- Consequence if indefinite: more rows over time.
- Blocks implementation: no.
- Latest decision point: before Task 14 verification documentation.

Blocking decisions:

- No remaining stakeholder decision blocks Batch A.
- Database/RLS design review should happen before Batch B.

## Review Requirements Before Commit

Before each future task commit, review for:

- Contradictions with the design spec.
- Undefined entities.
- Inconsistent table names.
- Inconsistent method names.
- Missing ownership rules.
- Missing coordinator restrictions.
- Missing public/private distinction.
- Missing backward compatibility.
- Missing migration ordering.
- Missing test coverage.
- Accidental Phase 2.3 UI implementation.
- Unsupported assumptions.
- Duplicate systems that should reuse current tables.

## Final Validation for This Planning Task

For this documentation-only planning task, run only:

- `git diff --check`
- `git grep -n -E "^(<<<<<<<|=======|>>>>>>>)"`

Do not run:

- Type-check.
- Build.
- Browser tests.
- Full test suite.
- Database commands.
- Migration generation or application.

Expected changed files:

- `docs/specs/structured-venue-foundation-design.md`
- `docs/plans/structured-venue-foundation-implementation.md`
