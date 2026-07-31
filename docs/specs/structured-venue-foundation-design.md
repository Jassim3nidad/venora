# Structured Venue Foundation Design

Phase: 2.2 Planning - Structured Venue Foundation
Repository: C:\venora
Status: implementation-ready design for stakeholder review

## 1. Purpose

Phase 2.2 establishes the secure structured-data foundation for immersive venue profiles. It does not build the final owner editor or public venue page. It defines the database model, validation contracts, repository boundaries, server-action responsibilities, RLS strategy, migration order, and verification plan that later phases will consume.

Later phases will build:

- Phase 2.3: venue-owner structured editor.
- Phase 2.4: public immersive venue profile.
- Phase 2.5+: showcases, accommodations, dining, virtual tours, advanced media, and deeper personalization.

## 2. Goals

- Make venue spaces first-class entities.
- Store searchable structured data instead of unbounded marketing text.
- Secure venue-owner and assigned-coordinator management.
- Support Draft -> Preview -> Published workflow.
- Keep public-page contracts reusable and stable.
- Prepare deterministic Event Plan compatibility fields.
- Preserve backward compatibility for all existing published venues.

## 3. Non-goals

Phase 2.2 will not implement:

- Final owner-editor UI.
- Final public venue-profile UI.
- Accommodations.
- Dining.
- Event showcases.
- Floor plans.
- Property maps.
- 360 tours.
- Hotspots.
- Recommendation ranking.
- Numeric match scores.
- Site-visit scheduling.
- Booking workflow changes.
- Payment workflow changes.
- AI recommendations.

## 4. Existing Architecture to Reuse

Existing tables and concepts:

- `venues`: owner organization, core listing identity, location, capacity, base price, setting, booleans, policies, status.
- `venue_images`: current venue media table used by the existing gallery and video components.
- `amenities` and `venue_amenities`: searchable amenity taxonomy and current venue-level joins.
- `event_types` and `venue_event_types`: searchable event-type taxonomy and current venue-level joins.
- `venue_packages`: package name, description, price, guest range, inclusions, active state, deposit terms, event type.
- `package_suppliers`: existing package-to-supplier join.
- `venue_supplier_agreements`: venue-to-supplier commercial agreement.
- `venue_availability`: date availability state.
- `bookings`, `inquiries`, `favorites`, `reviews`: existing customer journey data.
- `business_profiles` and `business_profile_publications`: useful publication precedent for owner identity, but not a replacement for venue-structured content.
- `event_plans`: customer-owned Event Plan context for later deterministic compatibility explanations.

Existing routes and components:

- `apps/web/app/(customer)/venues/[slug]/page.tsx`
- `apps/web/src/features/venues/ui/VenueDetails.tsx`
- `apps/web/src/features/venues/ui/VenueGallery.tsx`
- `apps/web/src/features/venues/ui/VenuePromotionalVideo.tsx`
- `apps/web/src/features/venues/ui/BookingSidebar.tsx`
- `apps/web/src/features/venues/ui/InquiryDialog.tsx`
- `apps/web/src/features/venues/ui/ReviewsSection.tsx`
- `apps/web/app/(venue-owner)/dashboard/venues/[id]/edit/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/packages/new/_components/PackageBuilderForm.tsx`
- `apps/web/app/(venue-owner)/dashboard/calendar/page.tsx`
- `apps/web/src/components/venues/VenuePhotoUpload.tsx`
- `apps/web/src/components/venues/VenueVideoUpload.tsx`

Existing application helpers and patterns:

- `apps/web/src/features/venues/application/actions.ts`
- `apps/web/src/features/venues/application/queries.ts`
- `apps/web/src/features/venues/application/package-actions.ts`
- `apps/web/src/features/venues/application/package-queries.ts`
- `apps/web/src/features/calendar/application/calendar-actions.ts`
- `apps/web/src/features/calendar/utils/availability.ts`
- `apps/web/src/features/event-planning/utils/event-plan-search-mapper.ts`
- `apps/web/src/lib/rbac/ownership.ts`
- `apps/web/src/lib/rbac/coordinator-permissions.ts`
- `apps/web/src/features/staff/coordinator-permissions.ts`

Storage:

- Reuse the `venue-images` bucket.
- Preserve the current path convention: `{organization_id}/{venue_id}/{filename}`.
- Reuse the path-scoped policy direction from `supabase/migrations/20260728161000_qualify_venue_media_object_path.sql`.

Authorization:

- Reuse `organization_members`.
- Reuse `public.is_org_member(org_id)`.
- Reuse `public.is_org_member_for_venue(p_venue_id)`.
- Reuse `public.is_admin()` where the project already uses admin bypass.
- Reuse coordinator assignment and permissions:
  - `organization_members.permissions`
  - `venue_coordinator_assignments`
  - `manage_assigned_venue_listings`

## 5. Proposed Entity Model

Final Phase 2.2 entities:

- `venue_profile_revisions`
- `venue_spaces`
- `venue_space_capacity_layouts`
- `venue_space_amenities`
- `venue_space_event_types`
- `venue_media_collections`
- `venue_media_items`
- `venue_logistics`
- `venue_faqs`
- `package_venue_spaces`

Rejected or deferred entities:

- `venue_publication_state`: folded into `venue_profile_revisions`.
- `venue_virtual_tours`: deferred until virtual-tour implementation.
- `venue_floor_plans`: deferred until floor-plan media is in scope.
- `venue_accommodation_types`: deferred.
- `venue_dining_options`: deferred.
- `venue_event_showcases`: deferred.

### venue_profile_revisions

- Purpose: revision container for draft and published structured venue content.
- Parent: `venues`.
- Ownership: inherited from `venues.organization_id`.
- Primary key: `id uuid`.
- Important fields: `venue_id`, `status`, `revision_number`, `created_from_revision_id`, `published_at`, `published_by`.
- Required fields: `venue_id`, `status`, `revision_number`.
- Optional fields: `created_from_revision_id`, `published_at`, `published_by`, `archived_at`.
- Uniqueness: one draft revision per venue; one published revision per venue.
- Ordering: by `revision_number`.
- Publication behavior: public queries use the published revision only.
- Delete behavior: deleting a venue cascades; old archived revisions remain until retention policy is applied.
- Timestamps: `created_at`, `updated_at`.
- Indexes: `venue_id`, `(venue_id, status)`.
- Validation concerns: valid state transitions and one active draft/published row.
- RLS boundary: owner/admin manage; public can select published revision metadata only if needed.
- MVP requirement: required.

### venue_spaces

- Purpose: event-usable spaces within a structured venue revision.
- Parent: `venue_profile_revisions`.
- Ownership: inherited through revision -> venue -> organization.
- Primary key: `id uuid`.
- Important fields: `revision_id`, `venue_id`, `space_key`, `name`, `slug`, `space_type`, `setting`, `short_description`, `description`, `capacity_min`, `capacity_max`, `accessibility_summary`, `restrictions`, `operating_notes`, `display_order`, `status`.
- Required fields: `revision_id`, `venue_id`, `space_key`, `name`, `slug`, `setting`, `capacity_max`, `display_order`, `status`.
- Optional fields: descriptions, type, min capacity, accessibility, restrictions, operating notes.
- Uniqueness: `(revision_id, slug)` and `(revision_id, space_key)`.
- Ordering: `display_order`, then `name`.
- Publication behavior: public queries return spaces from the published revision with `status = 'published'`.
- Delete behavior: draft spaces can be deleted; published spaces are archived through a new revision.
- Timestamps: `created_at`, `updated_at`, `archived_at`.
- Indexes: `revision_id`, `venue_id`, `(revision_id, display_order)`, `(venue_id, status)`, `capacity_max`, `setting`.
- Validation concerns: capacity bounds, slug format, length limits.
- RLS boundary: inherited from revision.
- MVP requirement: required.

### venue_space_capacity_layouts

- Purpose: space capacity by layout.
- Parent: `venue_spaces`.
- Ownership: inherited through space.
- Primary key: `id uuid`.
- Important fields: `space_id`, `layout`, `custom_layout_label`, `capacity`, `notes`, `display_order`.
- Required fields: `space_id`, `layout`, `capacity`, `display_order`.
- Optional fields: `custom_layout_label`, `notes`.
- Uniqueness: `(space_id, layout, custom_layout_label)`.
- Ordering: `display_order`.
- Publication behavior: published when parent space is published.
- Delete behavior: cascades with space revision row.
- Timestamps: `created_at`, `updated_at`.
- Indexes: `space_id`, `layout`, `capacity`.
- Validation concerns: nonnegative capacity, custom label required only for `layout = 'custom'`.
- RLS boundary: inherited from space.
- MVP requirement: required.

### venue_space_amenities

- Purpose: reusable searchable amenity relationships at space level.
- Parent: `venue_spaces` and `amenities`.
- Ownership: inherited through space.
- Primary key: composite `(space_id, amenity_id)` or `id uuid`; prefer composite unless generated types or repository style require `id`.
- Important fields: `space_id`, `amenity_id`, `notes`.
- Required fields: `space_id`, `amenity_id`.
- Optional fields: `notes`.
- Uniqueness: `(space_id, amenity_id)`.
- Ordering: by amenity name in queries.
- Publication behavior: published when parent space is published.
- Delete behavior: cascades with space revision row.
- Timestamps: `created_at`.
- Indexes: `space_id`, `amenity_id`.
- Validation concerns: amenity must exist in `amenities`.
- RLS boundary: inherited from space.
- MVP requirement: required.

### venue_space_event_types

- Purpose: reusable searchable event-type relationships at space level.
- Parent: `venue_spaces` and `event_types`.
- Ownership: inherited through space.
- Primary key: composite `(space_id, event_type_id)` or `id uuid`; prefer composite unless generated types or repository style require `id`.
- Important fields: `space_id`, `event_type_id`, `notes`.
- Required fields: `space_id`, `event_type_id`.
- Optional fields: `notes`.
- Uniqueness: `(space_id, event_type_id)`.
- Ordering: by event type name in queries.
- Publication behavior: published when parent space is published.
- Delete behavior: cascades with space revision row.
- Timestamps: `created_at`.
- Indexes: `space_id`, `event_type_id`.
- Validation concerns: event type must exist in `event_types`.
- RLS boundary: inherited from space.
- MVP requirement: required.

### venue_media_collections

- Purpose: group venue and space media.
- Parent: `venue_profile_revisions`, optionally `venue_spaces`.
- Ownership: inherited through revision and venue.
- Primary key: `id uuid`.
- Important fields: `revision_id`, `venue_id`, `space_id`, `collection_type`, `title`, `description`, `display_order`, `is_cover`, `status`.
- Required fields: `revision_id`, `venue_id`, `collection_type`, `display_order`, `status`.
- Optional fields: `space_id`, title, description.
- Uniqueness: one cover collection per revision; `(revision_id, space_id, collection_type, display_order)` for ordering.
- Ordering: `display_order`.
- Publication behavior: public reads collections on published revision with published status.
- Delete behavior: cascades with revision; storage cleanup handled separately for items.
- Timestamps: `created_at`, `updated_at`.
- Indexes: `revision_id`, `venue_id`, `space_id`, `(revision_id, display_order)`.
- Validation concerns: `space_id` must belong to same revision when present.
- RLS boundary: inherited from revision.
- MVP requirement: required.

### venue_media_items

- Purpose: individual images, stored videos, or approved external media records inside a collection.
- Parent: `venue_media_collections`.
- Ownership: inherited through collection.
- Primary key: `id uuid`.
- Important fields: `collection_id`, `venue_id`, `space_id`, `storage_path`, `legacy_venue_image_id`, `media_type`, `external_url`, `external_provider`, `alt_text`, `caption`, `transcript`, `display_order`, `is_featured`, `status`, `moderation_status`.
- Required fields: `collection_id`, `venue_id`, `media_type`, `display_order`, `status`.
- Optional fields: `space_id`, storage path, legacy image id, external URL/provider, alt text, caption, transcript.
- Uniqueness: `(collection_id, display_order)`; `legacy_venue_image_id` unique when present.
- Ordering: `display_order`.
- Publication behavior: public reads items on published revision when `status = 'published'` and moderation allows it.
- Delete behavior: row deletion in draft; published removal through archive in a new revision; storage object cleanup after no item references it.
- Timestamps: `created_at`, `updated_at`, `deleted_at`.
- Indexes: `collection_id`, `venue_id`, `space_id`, `(collection_id, display_order)`, `legacy_venue_image_id`.
- Validation concerns: either `storage_path` or `external_url`, not both; HTTPS external URL; approved provider only; no iframe HTML.
- RLS boundary: inherited from collection.
- MVP requirement: required for grouped images.

### venue_logistics

- Purpose: one structured logistics record per revision.
- Parent: `venue_profile_revisions`.
- Ownership: inherited through revision.
- Primary key: `id uuid`.
- Important fields: `revision_id`, `venue_id`, `parking_capacity`, `parking_notes`, `accessibility_notes`, `arrival_notes`, `public_transportation_notes`, `weather_backup_available`, `weather_backup_notes`, `curfew_time`, `noise_restrictions`, `setup_rules`, `teardown_rules`, `external_supplier_rules`, `pet_policy`, `smoking_policy`, `other_notes`, `status`.
- Required fields: `revision_id`, `venue_id`, `status`.
- Optional fields: all practical detail fields.
- Uniqueness: one logistics row per revision.
- Ordering: not applicable.
- Publication behavior: public reads only published revision logistics.
- Delete behavior: cascades with revision.
- Timestamps: `created_at`, `updated_at`.
- Indexes: `revision_id`, `venue_id`, `weather_backup_available`, `parking_capacity`.
- Validation concerns: text length, nonnegative parking capacity, time format.
- RLS boundary: inherited from revision.
- MVP requirement: required.

### venue_faqs

- Purpose: customer-facing venue questions and answers.
- Parent: `venue_profile_revisions`.
- Ownership: inherited through revision.
- Primary key: `id uuid`.
- Important fields: `revision_id`, `venue_id`, `question`, `answer`, `category`, `display_order`, `status`.
- Required fields: `revision_id`, `venue_id`, `question`, `answer`, `display_order`, `status`.
- Optional fields: category.
- Uniqueness: `(revision_id, question)` after normalized lower-case comparison if feasible; otherwise enforce in validation.
- Ordering: `display_order`.
- Publication behavior: public reads FAQs on published revision with `status = 'published'`.
- Delete behavior: draft delete; published removal through archived item in a new revision.
- Timestamps: `created_at`, `updated_at`.
- Indexes: `revision_id`, `venue_id`, `(revision_id, display_order)`.
- Validation concerns: plain text or restricted rich text only; no scripts or raw HTML.
- RLS boundary: inherited from revision.
- MVP requirement: required.

### package_venue_spaces

- Purpose: connect `venue_packages` to one or more structured spaces.
- Parent: `venue_packages` and `venue_spaces`.
- Ownership: package and space must belong to the same venue.
- Primary key: `id uuid`.
- Important fields: `package_id`, `space_id`, `venue_id`, `inclusion_type`, `inclusion_notes`, `display_order`.
- Required fields: `package_id`, `space_id`, `venue_id`, `inclusion_type`, `display_order`.
- Optional fields: inclusion notes.
- Uniqueness: `(package_id, space_id)`.
- Ordering: `display_order`.
- Publication behavior: public reads only when package is active and space belongs to the published revision.
- Delete behavior: cascades with package; archived space hides public relationship.
- Timestamps: `created_at`, `updated_at`.
- Indexes: `package_id`, `space_id`, `venue_id`.
- Validation concerns: package and space must belong to same venue.
- RLS boundary: inherited from venue/package.
- MVP requirement: required.

## 6. Exact Proposed Schema

Column specifications are implementation-ready, but not executable SQL.

### venue_profile_revisions

| Column | Type | Null | Default | FK | Constraint | Index | Mutability | Public exposure |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() | none | primary key | primary | immutable | no |
| venue_id | uuid | no | none | venues(id) on delete cascade | required | yes | immutable | public via published data |
| status | text | no | 'draft' | none | in draft, published, archived | partial unique | mutable through transitions | public published only |
| revision_number | integer | no | 1 | none | >= 1 | yes | immutable | no |
| created_from_revision_id | uuid | yes | null | venue_profile_revisions(id) on delete set null | none | no | immutable | no |
| published_at | timestamptz | yes | null | none | required when published | yes | system only | public metadata optional |
| published_by | uuid | yes | null | profiles(id) | required when published | no | system only | no |
| archived_at | timestamptz | yes | null | none | required when archived | no | system only | no |
| created_at | timestamptz | no | now() | none | none | no | system only | no |
| updated_at | timestamptz | no | now() | none | none | no | system only | no |

Unique constraints:

- One draft per venue: partial unique `(venue_id)` where `status = 'draft'`.
- One published per venue: partial unique `(venue_id)` where `status = 'published'`.
- Unique `(venue_id, revision_number)`.

### venue_spaces

| Column | Type | Null | Default | FK | Constraint | Index | Mutability | Public exposure |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() | none | primary key | primary | immutable | yes when published |
| revision_id | uuid | no | none | venue_profile_revisions(id) on delete cascade | required | yes | immutable | no |
| venue_id | uuid | no | none | venues(id) on delete cascade | required | yes | immutable | no |
| space_key | uuid | no | gen_random_uuid() | none | stable key across revisions | yes | immutable | no |
| name | text | no | none | none | 2-120 chars | search index later | mutable in draft | yes |
| slug | text | no | none | none | lower slug format | unique per revision | mutable in draft | yes |
| space_type | text | yes | null | none | controlled text when present | yes | mutable in draft | yes |
| setting | text | no | none | none | indoor, outdoor, mixed | yes | mutable in draft | yes |
| short_description | text | yes | null | none | <= 220 chars | no | mutable in draft | yes |
| description | text | yes | null | none | <= 4000 chars | no | mutable in draft | yes |
| capacity_min | integer | yes | null | none | >= 0 | yes | mutable in draft | yes |
| capacity_max | integer | no | none | none | 0-100000 | yes | mutable in draft | yes |
| accessibility_summary | text | yes | null | none | <= 1000 chars | no | mutable in draft | yes |
| restrictions | text | yes | null | none | <= 2000 chars | no | mutable in draft | yes |
| operating_notes | text | yes | null | none | <= 2000 chars | no | mutable in draft | yes |
| display_order | integer | no | 0 | none | >= 0 | yes | mutable in draft | yes |
| status | text | no | 'draft' | none | draft, published, archived | yes | mutable through transitions | yes when published |
| created_at | timestamptz | no | now() | none | none | no | system only | no |
| updated_at | timestamptz | no | now() | none | none | no | system only | no |
| archived_at | timestamptz | yes | null | none | none | no | system only | no |

Unique constraints:

- `(revision_id, slug)`.
- `(revision_id, space_key)`.

### venue_space_capacity_layouts

| Column | Type | Null | Default | FK | Constraint | Index | Mutability | Public exposure |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() | none | primary key | primary | immutable | yes when published |
| space_id | uuid | no | none | venue_spaces(id) on delete cascade | required | yes | immutable | no |
| venue_id | uuid | no | none | venues(id) on delete cascade | same venue as space | yes | immutable | no |
| layout | text | no | none | none | banquet, theatre, classroom, cocktail, u_shape, boardroom, standing, ceremony, custom | yes | mutable in draft | yes |
| custom_layout_label | text | yes | null | none | required when layout custom | no | mutable in draft | yes |
| capacity | integer | no | none | none | 0-100000 | yes | mutable in draft | yes |
| notes | text | yes | null | none | <= 1000 chars | no | mutable in draft | yes |
| display_order | integer | no | 0 | none | >= 0 | yes | mutable in draft | yes |
| created_at | timestamptz | no | now() | none | none | no | system only | no |
| updated_at | timestamptz | no | now() | none | none | no | system only | no |

Unique constraint:

- `(space_id, layout, custom_layout_label)`.

### venue_space_amenities

| Column | Type | Null | Default | FK | Constraint | Index | Mutability | Public exposure |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| space_id | uuid | no | none | venue_spaces(id) on delete cascade | required | yes | immutable | no |
| amenity_id | uuid | no | none | amenities(id) on delete restrict | required | yes | immutable | yes joined name |
| venue_id | uuid | no | none | venues(id) on delete cascade | same venue as space | yes | immutable | no |
| notes | text | yes | null | none | <= 500 chars | no | mutable in draft | yes |
| created_at | timestamptz | no | now() | none | none | no | system only | no |

Primary key:

- `(space_id, amenity_id)`.

### venue_space_event_types

| Column | Type | Null | Default | FK | Constraint | Index | Mutability | Public exposure |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| space_id | uuid | no | none | venue_spaces(id) on delete cascade | required | yes | immutable | no |
| event_type_id | uuid | no | none | event_types(id) on delete restrict | required | yes | immutable | yes joined name |
| venue_id | uuid | no | none | venues(id) on delete cascade | same venue as space | yes | immutable | no |
| notes | text | yes | null | none | <= 500 chars | no | mutable in draft | yes |
| created_at | timestamptz | no | now() | none | none | no | system only | no |

Primary key:

- `(space_id, event_type_id)`.

### venue_media_collections

| Column | Type | Null | Default | FK | Constraint | Index | Mutability | Public exposure |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() | none | primary key | primary | immutable | yes when published |
| revision_id | uuid | no | none | venue_profile_revisions(id) on delete cascade | required | yes | immutable | no |
| venue_id | uuid | no | none | venues(id) on delete cascade | required | yes | immutable | no |
| space_id | uuid | yes | null | venue_spaces(id) on delete cascade | same revision when present | yes | immutable in draft after item exists | no |
| collection_type | text | no | 'gallery' | none | hero, gallery, space_gallery, video, logistics | yes | mutable in draft | yes |
| title | text | yes | null | none | <= 120 chars | no | mutable in draft | yes |
| description | text | yes | null | none | <= 500 chars | no | mutable in draft | yes |
| display_order | integer | no | 0 | none | >= 0 | yes | mutable in draft | yes |
| is_cover | boolean | no | false | none | one cover per revision | partial unique | mutable in draft | yes |
| status | text | no | 'draft' | none | draft, published, archived | yes | mutable through transitions | yes when published |
| created_at | timestamptz | no | now() | none | none | no | system only | no |
| updated_at | timestamptz | no | now() | none | none | no | system only | no |

### venue_media_items

| Column | Type | Null | Default | FK | Constraint | Index | Mutability | Public exposure |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() | none | primary key | primary | immutable | yes when published |
| collection_id | uuid | no | none | venue_media_collections(id) on delete cascade | required | yes | immutable | no |
| venue_id | uuid | no | none | venues(id) on delete cascade | required | yes | immutable | no |
| space_id | uuid | yes | null | venue_spaces(id) on delete cascade | same collection space when present | yes | immutable | no |
| storage_path | text | yes | null | none | path convention for uploaded files | yes | mutable in draft | public URL only |
| legacy_venue_image_id | uuid | yes | null | venue_images(id) on delete set null | unique when present | yes | immutable | no |
| media_type | text | no | none | none | image, video, external_video | yes | mutable in draft | yes |
| external_url | text | yes | null | none | HTTPS only; approved providers | no | mutable in draft | safe URL only |
| external_provider | text | yes | null | none | youtube, vimeo, approved_future_provider | yes | mutable in draft | yes |
| alt_text | text | yes | null | none | <= 300 chars | no | mutable in draft | yes |
| caption | text | yes | null | none | <= 500 chars | no | mutable in draft | yes |
| transcript | text | yes | null | none | <= 10000 chars | no | mutable in draft | yes |
| display_order | integer | no | 0 | none | >= 0 | yes | mutable in draft | yes |
| is_featured | boolean | no | false | none | one featured item per collection | partial unique | mutable in draft | yes |
| status | text | no | 'draft' | none | draft, published, archived | yes | mutable through transitions | yes when published |
| moderation_status | text | no | 'approved' | none | pending, approved, rejected | yes | admin/moderation only after upload | approved only |
| created_at | timestamptz | no | now() | none | none | no | system only | no |
| updated_at | timestamptz | no | now() | none | none | no | system only | no |
| deleted_at | timestamptz | yes | null | none | none | no | system only | no |

### venue_logistics

| Column | Type | Null | Default | FK | Constraint | Index | Mutability | Public exposure |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() | none | primary key | primary | immutable | yes when published |
| revision_id | uuid | no | none | venue_profile_revisions(id) on delete cascade | unique per revision | unique | immutable | no |
| venue_id | uuid | no | none | venues(id) on delete cascade | required | yes | immutable | no |
| parking_capacity | integer | yes | null | none | >= 0 | yes | mutable in draft | yes |
| parking_notes | text | yes | null | none | <= 1000 chars | no | mutable in draft | yes |
| accessibility_notes | text | yes | null | none | <= 1500 chars | no | mutable in draft | yes |
| arrival_notes | text | yes | null | none | <= 1500 chars | no | mutable in draft | yes |
| public_transportation_notes | text | yes | null | none | <= 1500 chars | no | mutable in draft | yes |
| weather_backup_available | boolean | yes | null | none | none | yes | mutable in draft | yes |
| weather_backup_notes | text | yes | null | none | <= 1500 chars | no | mutable in draft | yes |
| curfew_time | time | yes | null | none | none | no | mutable in draft | yes |
| noise_restrictions | text | yes | null | none | <= 1500 chars | no | mutable in draft | yes |
| setup_rules | text | yes | null | none | <= 2000 chars | no | mutable in draft | yes |
| teardown_rules | text | yes | null | none | <= 2000 chars | no | mutable in draft | yes |
| external_supplier_rules | text | yes | null | none | <= 2000 chars | no | mutable in draft | yes |
| pet_policy | text | yes | null | none | <= 1000 chars | no | mutable in draft | yes |
| smoking_policy | text | yes | null | none | <= 1000 chars | no | mutable in draft | yes |
| other_notes | text | yes | null | none | <= 2000 chars | no | mutable in draft | yes |
| status | text | no | 'draft' | none | draft, published, archived | yes | mutable through transitions | yes when published |
| created_at | timestamptz | no | now() | none | none | no | system only | no |
| updated_at | timestamptz | no | now() | none | none | no | system only | no |

Searchable fields:

- `parking_capacity`
- `weather_backup_available`

Informational fields:

- Notes, rules, policies, arrival information.

### venue_faqs

| Column | Type | Null | Default | FK | Constraint | Index | Mutability | Public exposure |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() | none | primary key | primary | immutable | yes when published |
| revision_id | uuid | no | none | venue_profile_revisions(id) on delete cascade | required | yes | immutable | no |
| venue_id | uuid | no | none | venues(id) on delete cascade | required | yes | immutable | no |
| question | text | no | none | none | 5-200 chars | no | mutable in draft | yes |
| answer | text | no | none | none | 5-2000 chars | no | mutable in draft | yes |
| category | text | yes | null | none | pricing, booking, logistics, suppliers, accessibility, policies, other | yes | mutable in draft | yes |
| display_order | integer | no | 0 | none | >= 0 | yes | mutable in draft | yes |
| status | text | no | 'draft' | none | draft, published, archived | yes | mutable through transitions | yes when published |
| created_at | timestamptz | no | now() | none | none | no | system only | no |
| updated_at | timestamptz | no | now() | none | none | no | system only | no |

### package_venue_spaces

| Column | Type | Null | Default | FK | Constraint | Index | Mutability | Public exposure |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| id | uuid | no | gen_random_uuid() | none | primary key | primary | immutable | yes when published |
| package_id | uuid | no | none | venue_packages(id) on delete cascade | required | yes | mutable in draft | yes |
| space_id | uuid | no | none | venue_spaces(id) on delete cascade | required | yes | mutable in draft | yes |
| venue_id | uuid | no | none | venues(id) on delete cascade | package and space same venue | yes | immutable | no |
| inclusion_type | text | no | 'included' | none | included, optional, upgrade | yes | mutable in draft | yes |
| inclusion_notes | text | yes | null | none | <= 1000 chars | no | mutable in draft | yes |
| display_order | integer | no | 0 | none | >= 0 | yes | mutable in draft | yes |
| created_at | timestamptz | no | now() | none | none | no | system only | no |
| updated_at | timestamptz | no | now() | none | none | no | system only | no |

Unique constraint:

- `(package_id, space_id)`.

## 7. Space Model

Space identity:

- `space_key` is a stable UUID used to correlate the same logical space across revisions.
- `id` identifies a specific revision row.
- `slug` is venue-scoped and revision-scoped, not globally unique.
- Preferred uniqueness: `(revision_id, slug)` and `(revision_id, space_key)`.

Venue ownership:

- Every space has `venue_id` for RLS and indexing.
- `venue_id` must match the parent revision's venue.

Display order:

- `display_order` is a nonnegative integer.
- Reordering is scoped to one revision.

Setting classification:

- Use check-constrained text: `indoor`, `outdoor`, `mixed`.
- This mirrors the current venue-level indoor/outdoor concept without adding a duplicate taxonomy table.

Capacity:

- `capacity_min` optional, nonnegative.
- `capacity_max` required, nonnegative, capped at 100000.
- `capacity_min <= capacity_max` when min exists.
- Space capacity may be lower than venue capacity.
- If any space capacity exceeds venue `capacity_max`, server validation should warn or reject based on product decision. Recommended default: warn during draft, block publish unless explicitly allowed by admin or updated venue-level capacity.

Publication state:

- Space rows exist inside a revision.
- Public spaces come only from the published revision and `status = 'published'`.

Description limits:

- `name`: 2-120 characters.
- `short_description`: max 220 characters.
- `description`: max 4000 characters.
- Accessibility, restrictions, operating notes: concise practical text with fixed limits.

Archiving:

- Draft spaces can be deleted.
- Published spaces are removed by creating a new draft revision without that space, then publishing it. Old published revision becomes archived.

## 8. Capacity-Layout Model

Supported layout values:

- `banquet`
- `theatre`
- `classroom`
- `cocktail`
- `u_shape`
- `boardroom`
- `standing`
- `ceremony`
- `custom`

Selected approach:

- Use check-constrained text for MVP.
- Do not create a lookup table yet because the list is stable, small, and product-controlled.
- Use `custom_layout_label` only when `layout = 'custom'`.

Capacity rules:

- Capacity must be a nonnegative whole number.
- Maximum approved capacity is 100000.
- Layout-specific capacity cannot exceed `venue_spaces.capacity_max` unless the publish validator rejects or requires a venue capacity correction.
- Overall `capacity_max` is the broadest advertised capacity for the space.
- Layout capacity is the more precise answer for a seating/standing configuration.

## 9. Amenities and Event Types

Use existing taxonomies:

- `amenities`
- `event_types`

Do not create duplicate amenity or event-type taxonomies.

Relationships:

- Use `venue_space_amenities` for space-level amenity support.
- Use `venue_space_event_types` for space-level event suitability.
- Keep existing `venue_amenities` and `venue_event_types` as venue-level relationships.

Validation:

- Space-level amenities must reference existing `amenities`.
- Space-level event types must reference existing `event_types`.
- Search can later match Event Plan requirements against both venue-level and space-level relationships.

## 10. Media Model

Venue-level versus space-level collections:

- Venue-level collection: `space_id` null.
- Space-level collection: `space_id` points to a `venue_spaces` row in the same revision.

Collection purpose:

- `hero`: top venue media.
- `gallery`: general venue gallery.
- `space_gallery`: media for one space.
- `video`: stored video or approved external video references.
- `logistics`: future practical media, not required for MVP UI.

Cover media:

- `venue_media_collections.is_cover` identifies the cover collection.
- `venue_media_items.is_featured` identifies featured item within a collection.

Media ordering:

- Collection order uses `venue_media_collections.display_order`.
- Item order uses `venue_media_items.display_order`.

Images:

- Use `venue-images` storage.
- Use existing path convention `{organization_id}/{venue_id}/{filename}`.
- `storage_path` must stay in the venue's organization/venue path.

Video:

- Existing uploaded video handling remains.
- New model can represent stored video by `media_type = 'video'`.

External URLs:

- No raw iframe HTML.
- External URLs must be HTTPS.
- MVP can validate `external_video` URLs for approved providers only.
- 360 tour providers are intentionally not implemented in Phase 2.2.

Captions and alt text:

- `alt_text` and `caption` are first-class fields.
- Public UI must never display broken image icons.
- Missing alt text should be blocked or warned before publish for image media.

Deletion and orphan cleanup:

- Deleting a draft media item removes the row.
- Removing published media creates a new revision without that media.
- Storage deletion must check whether any `venue_media_items` or legacy `venue_images` row still references the path.

Consent:

- `moderation_status` is included now.
- Real-event consent metadata is deferred to event showcase work.

## 11. Logistics Model

MVP logistics fields:

- `parking_capacity`: searchable.
- `parking_notes`: informational.
- `accessibility_notes`: informational and useful for Event Plan copy later.
- `arrival_notes`: informational.
- `public_transportation_notes`: informational.
- `weather_backup_available`: searchable.
- `weather_backup_notes`: informational.
- `curfew_time`: searchable in future filters if product needs it.
- `noise_restrictions`: informational.
- `setup_rules`: informational.
- `teardown_rules`: informational.
- `external_supplier_rules`: informational and supplier-policy related.
- `pet_policy`: informational.
- `smoking_policy`: informational.
- `other_notes`: informational.

Privacy:

- Do not collect private owner phone numbers, private home addresses, internal staff notes, or security-sensitive instructions.
- Keep public logistics at venue/customer planning level.

## 12. FAQ Model

FAQ requirements:

- Question: 5-200 characters.
- Answer: 5-2000 characters.
- Category: optional controlled text.
- Display order: nonnegative integer.
- Status follows revision publication.

Content policy:

- Store plain text for MVP.
- Do not allow arbitrary HTML.
- Restricted rich text can be considered later only with a sanitizer and rendering rules.

Owner management:

- Owners and assigned coordinators with listing-management permission can manage draft FAQs.
- Public visitors read published FAQs only.

## 13. Publication Workflow

States:

- `draft`
- `published`
- `archived`

Preview is not a stored state. Preview is a server-authorized read of the draft revision.

Transitions:

- None -> draft: owner or assigned coordinator with listing-management permission creates a draft.
- draft -> published: owner can publish; coordinator publish requires explicit permission decision.
- published -> archived: system archives the previous published revision during publish.
- draft -> archived: owner can discard draft.
- published -> draft: not direct; create draft from published revision.

Who can create drafts:

- Venue owner.
- Assigned coordinator only with `manage_assigned_venue_listings`.
- Administrator.

Who can preview:

- Venue owner.
- Assigned coordinator with `view_assigned_venues` or `manage_assigned_venue_listings`.
- Administrator.

Who can publish:

- Venue owner.
- Administrator.
- Coordinator only if stakeholder approves a new explicit permission. Recommended default: coordinator can edit draft but owner publishes.

Incomplete drafts:

- Drafts can be incomplete.
- Incomplete drafts do not affect public pages.
- Publish validation blocks missing required MVP fields.

Stable published content:

- Public queries read the current `published` revision.
- Draft changes stay in the `draft` revision.
- Publishing archives the old published revision and promotes the draft in one transaction.

Separate revisions:

- MVP uses one draft and one published revision per venue.
- Enterprise-level historical version browsing is not required.

Unpublishing:

- Unpublishing structured content archives the published revision.
- The existing `venues` record remains the public source of truth.
- `/venues/[slug]` must still render.

Archived spaces:

- Archived rows remain historical data.
- Public queries exclude archived revisions and archived spaces.

## 14. Backward Compatibility

Existing venues remain valid because:

- Existing `venues` fields remain public source of truth.
- Existing `venue_images` remain usable by current gallery.
- Existing `venue_packages` remain usable by current package UI.
- Structured sections appear only when a published structured revision exists.
- Missing spaces, logistics, FAQs, or grouped media never make a published venue unpublishable.
- Existing booking, inquiry, review, favorite, and availability flows are untouched.

Safe fallback:

- If no `venue_profile_revisions.status = 'published'` row exists, public venue page uses the current behavior.
- If a structured published revision exists but a section is empty, public page hides only that section.
- Existing media can be migrated or mirrored into structured media later without deleting `venue_images`.

## 15. Package-to-Space Relationship

Package inclusion:

- A package can include one or more spaces.
- `inclusion_type` values: `included`, `optional`, `upgrade`.
- `inclusion_notes` explains scope without changing price semantics.

Ownership validation:

- `venue_packages.venue_id` must equal `venue_spaces.venue_id`.
- `package_venue_spaces.venue_id` is denormalized for RLS/indexing and must match both.

Display ordering:

- `display_order` controls package space order.

Pricing:

- The relationship does not alter price.
- Package price remains controlled by existing `venue_packages` fields.
- Public copy must label prices as starting, package, estimated, or custom quote according to existing data.

Delete/archive behavior:

- Deleting a draft space removes draft package relationships.
- Archiving a published space hides public package-space relationship.
- Deleting a package cascades relationships.

## 16. Ownership and Role Model

Venue owner:

- Can create, edit, preview, publish, archive, and discard structured venue revisions for owned organization venues.

Assigned event coordinator:

- Must be an `organization_members` row for the venue organization.
- Must be assigned to the venue through `venue_coordinator_assignments`.
- Must have relevant permissions in `organization_members.permissions`.
- Existing safe default:
  - `manage_assigned_venue_listings` for editing draft spaces, media, logistics, FAQs, and package-space links.
  - `view_assigned_venues` for preview.
- Publishing by coordinator requires stakeholder approval. Recommended default: not allowed in Phase 2.2 unless a new explicit permission is added later.

Customer:

- Can select published structured content.
- Cannot select drafts.
- Cannot insert, update, publish, archive, or delete.

Supplier:

- Can select public published content like any visitor.
- Does not manage venue structured content.

Administrator:

- Can manage all structured content through existing admin patterns.
- If granular admin permission is required later, use existing `has_admin_permission` direction.

Anonymous visitor:

- Can select published structured content only.
- Cannot view drafts or private fields.

Coordinator permission gaps:

- Current permission catalog does not distinguish spaces, media, logistics, FAQs, or publish.
- Recommended Phase 2.2 default: reuse `manage_assigned_venue_listings` for draft content edits and block coordinator publishing.
- Future refinement may add:
  - `publish_assigned_venue_listings`
  - `manage_assigned_venue_media`

## 17. RLS Matrix

Recommended public-read strategy:

- Use RLS-readable published rows for public data.
- Server repositories should still shape data for `/venues/[slug]`.
- Draft preview uses server-controlled repositories with authenticated ownership checks.

| Role | Select published | Select drafts | Insert | Update | Archive | Delete | Publish |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Anonymous | yes | no | no | no | no | no | no |
| Customer | yes | no | no | no | no | no | no |
| Venue owner | yes | own venue drafts | own venue drafts | own venue drafts | own venue drafts | draft rows only | own venue |
| Assigned coordinator | yes | assigned venue drafts if permitted | assigned venue drafts if permitted | assigned venue drafts if permitted | assigned venue drafts if permitted | draft rows only if permitted | no by default |
| Supplier | yes | no | no | no | no | no | no |
| Administrator | yes | yes | yes | yes | yes | yes | yes |

For every proposed table:

- Public select policy filters through `venue_profile_revisions.status = 'published'`.
- Owner write policy checks organization ownership through the related `venues.organization_id`.
- Coordinator write policy must check both assignment and permission.
- Admin policy follows existing admin convention.

Helper function recommendation:

- Add a database helper in implementation phase only if needed:
  - `public.can_manage_venue_structured_content(p_venue_id uuid)`
  - `public.can_preview_venue_structured_content(p_venue_id uuid)`
  - `public.can_publish_venue_structured_content(p_venue_id uuid)`

These helpers should not grant broad coordinator access based on role alone.

## 18. Validation Contracts

Names:

- Required, trimmed, 2-120 characters.

Slugs:

- Lowercase kebab-case.
- Unique within a revision.
- Generated from name but editable in draft.

Descriptions:

- Short description max 220 characters.
- Long description max 4000 characters.
- Plain text for MVP.

Capacities:

- Integers only.
- Minimum 0.
- Maximum 100000.
- `capacity_min <= capacity_max`.
- Layout capacity should not exceed space max without publish failure.

Display order:

- Nonnegative integer.
- Reorder operations should accept ordered IDs and normalize to 0..n.

Amenities/event types:

- Must reference existing lookup rows.
- Duplicate relationships rejected.

Media URLs:

- HTTPS only.
- Approved providers only for external media.
- No raw iframe HTML.
- Uploaded storage paths must match organization/venue path.

Captions and alt text:

- Alt text max 300 characters.
- Caption max 500 characters.
- Images require alt text before publish unless explicitly decorative and marked as such in a later model.

FAQs:

- Question 5-200 characters.
- Answer 5-2000 characters.
- Plain text only.

Logistics:

- Text fields have fixed limits.
- Parking capacity nonnegative.
- Curfew time valid PostgreSQL `time`.

Publication transitions:

- Draft must belong to venue.
- Publish must be transactional.
- Publish must archive old published revision.
- Publish must validate required MVP content.

Package-space relationships:

- Package and space must belong to same venue.
- Space must belong to the active draft or published revision being managed.
- Relationship does not mutate package pricing.

## 19. Repository Contracts

Proposed module path:

- `apps/web/src/features/venues/application/structured-profile-repository.ts`

Proposed types path:

- `apps/web/src/features/venues/domain/structured-venue.types.ts`

Repository methods:

- `getOrCreateDraftRevisionForVenue(input): Promise<Result<VenueProfileRevision>>`
- `findDraftRevisionForVenue(input): Promise<Result<VenueProfileRevision | null>>`
- `findPublishedRevisionForVenue(input): Promise<Result<VenueProfileRevision | null>>`
- `publishDraftRevisionForVenue(input): Promise<Result<VenueProfileRevision>>`
- `discardDraftRevisionForVenue(input): Promise<Result<void>>`
- `createSpaceForVenue(input): Promise<Result<VenueSpace>>`
- `findSpaceByIdForVenue(input): Promise<Result<VenueSpace | null>>`
- `listSpacesForOwner(input): Promise<Result<VenueSpace[]>>`
- `listPublishedSpaces(input): Promise<Result<VenueSpace[]>>`
- `updateSpaceForVenue(input): Promise<Result<VenueSpace>>`
- `reorderSpacesForVenue(input): Promise<Result<VenueSpace[]>>`
- `archiveSpaceForVenue(input): Promise<Result<void>>`
- `publishSpaceForVenue(input): Promise<Result<VenueSpace>>`
- `replaceCapacityLayoutsForSpace(input): Promise<Result<VenueSpaceCapacityLayout[]>>`
- `listCapacityLayoutsForSpace(input): Promise<Result<VenueSpaceCapacityLayout[]>>`
- `replaceSpaceAmenities(input): Promise<Result<void>>`
- `replaceSpaceEventTypes(input): Promise<Result<void>>`
- `createMediaCollection(input): Promise<Result<VenueMediaCollection>>`
- `updateMediaCollection(input): Promise<Result<VenueMediaCollection>>`
- `reorderMediaCollections(input): Promise<Result<VenueMediaCollection[]>>`
- `addMediaItemToCollection(input): Promise<Result<VenueMediaItem>>`
- `updateMediaItem(input): Promise<Result<VenueMediaItem>>`
- `reorderMediaItems(input): Promise<Result<VenueMediaItem[]>>`
- `archiveMediaItem(input): Promise<Result<void>>`
- `upsertVenueLogistics(input): Promise<Result<VenueLogistics>>`
- `getVenueLogistics(input): Promise<Result<VenueLogistics | null>>`
- `createVenueFaq(input): Promise<Result<VenueFaq>>`
- `updateVenueFaq(input): Promise<Result<VenueFaq>>`
- `reorderVenueFaqs(input): Promise<Result<VenueFaq[]>>`
- `archiveVenueFaq(input): Promise<Result<void>>`
- `replacePackageVenueSpaces(input): Promise<Result<PackageVenueSpace[]>>`
- `listPackageVenueSpaces(input): Promise<Result<PackageVenueSpace[]>>`
- `getPublishedStructuredVenueProfile(input): Promise<Result<PublishedStructuredVenueProfile | null>>`
- `getDraftStructuredVenueProfile(input): Promise<Result<DraftStructuredVenueProfile | null>>`

Input requirements:

- Server-derived `userId`.
- `venueId`.
- Draft or published `revisionId` where appropriate.
- Validated payload.

Result style:

- Follow existing Venora safe result conventions where available.
- Never throw raw database errors to UI.

## 20. Server-Action Contracts

Proposed action path:

- `apps/web/src/features/venues/application/structured-profile-actions.ts`

Responsibilities:

- Resolve authenticated user server-side.
- Fetch user roles/membership server-side.
- Validate venue ownership or coordinator assignment.
- Validate `organization_members.permissions`.
- Never trust owner, organization, role, or permission values from browser input.
- Validate all input with Zod.
- Call repository functions.
- Return safe errors.
- Revalidate relevant routes.
- Avoid service-role usage except existing approved server administration.

Proposed actions:

- `createVenueSpaceAction`
- `updateVenueSpaceAction`
- `reorderVenueSpacesAction`
- `archiveVenueSpaceAction`
- `replaceVenueSpaceCapacityLayoutsAction`
- `replaceVenueSpaceAmenitiesAction`
- `replaceVenueSpaceEventTypesAction`
- `createVenueMediaCollectionAction`
- `updateVenueMediaCollectionAction`
- `addVenueMediaItemAction`
- `updateVenueMediaItemAction`
- `reorderVenueMediaItemsAction`
- `archiveVenueMediaItemAction`
- `upsertVenueLogisticsAction`
- `createVenueFaqAction`
- `updateVenueFaqAction`
- `reorderVenueFaqsAction`
- `archiveVenueFaqAction`
- `replacePackageVenueSpacesAction`
- `publishStructuredVenueProfileAction`
- `discardStructuredVenueDraftAction`

Revalidation targets after mutation:

- `/dashboard/venues/[id]/edit`
- `/dashboard/coordinator/venues`
- `/venues/[slug]`
- `/venues/[slug]/book` only when package-space or public fit data changes and later consumers use it.

## 21. Event Plan Compatibility

Fields that support later deterministic explanations:

- Guest capacity: `venue_spaces.capacity_min`, `venue_spaces.capacity_max`, `venue_space_capacity_layouts.capacity`.
- Indoor/outdoor setting: `venue_spaces.setting`.
- Event type: `venue_space_event_types`.
- Amenities: `venue_space_amenities`.
- Accessibility: `venue_spaces.accessibility_summary`, `venue_logistics.accessibility_notes`.
- Parking: `venue_logistics.parking_capacity`, `venue_logistics.parking_notes`.
- Backup indoor-space indicator: spaces with `setting = 'indoor'` or `mixed`, plus weather backup fields.

Deferred comparisons:

- Accommodation indicator.
- Dining.
- Supplier/service fit.
- Budget.
- Numeric ranking.

Phase 2.2 does not implement fit display logic.

## 22. Security and Privacy

Cross-venue access:

- Every row denormalizes `venue_id` where useful for RLS.
- Foreign keys must be validated so child rows cannot point across venues.

Media path ownership:

- Storage paths must start with the venue organization's ID and venue ID.
- Server actions must verify the target venue before accepting a storage path.

External URL safety:

- HTTPS only.
- Provider allowlist.
- No raw iframe HTML.
- Store provider and URL separately.

Stored text rendering:

- Plain text for MVP.
- Public components escape text by default.
- No arbitrary HTML.

Supplier integrity:

- `package_venue_spaces` must not imply supplier availability.
- Supplier display remains based on `package_suppliers` and active agreements.

Publishing authorization:

- Owner/admin only by default.
- Coordinator publish is a non-blocking stakeholder decision.

Coordinator scoping:

- Role alone is not enough.
- Must check assignment and permission.

Public/private fields:

- Draft content private to owner/coordinator/admin.
- Published structured content public.
- No private owner contact or internal notes in these tables.

Deletion and orphan cleanup:

- Draft deletes are hard deletes.
- Published content removal is archive-through-revision.
- Storage cleanup must verify no row still references the object.

Audit:

- Publication actions should record `published_by`, `published_at`, previous revision, and next revision.
- A later audit log can be added if product requires admin review.

## 23. Performance and Indexing

Required indexes:

- `venue_profile_revisions(venue_id, status)`.
- `venue_profile_revisions(venue_id, revision_number)`.
- `venue_spaces(revision_id, display_order)`.
- `venue_spaces(venue_id, status)`.
- `venue_spaces(setting)`.
- `venue_spaces(capacity_max)`.
- `venue_space_capacity_layouts(space_id)`.
- `venue_space_capacity_layouts(layout, capacity)`.
- `venue_space_amenities(space_id)`.
- `venue_space_amenities(amenity_id)`.
- `venue_space_event_types(space_id)`.
- `venue_space_event_types(event_type_id)`.
- `venue_media_collections(revision_id, display_order)`.
- `venue_media_collections(space_id, display_order)`.
- `venue_media_items(collection_id, display_order)`.
- `venue_logistics(revision_id)` unique.
- `venue_logistics(venue_id)`.
- `venue_logistics(weather_backup_available)`.
- `venue_faqs(revision_id, display_order)`.
- `package_venue_spaces(package_id)`.
- `package_venue_spaces(space_id)`.
- `package_venue_spaces(venue_id)`.

Avoided speculative indexes:

- Full-text search over descriptions.
- Trigram indexes for names.
- Ranking indexes.
- Accommodation/dining/showcase indexes.

These can be added when real query patterns exist.

## 24. Migration Strategy

Migration order:

1. Core publication container: `venue_profile_revisions`.
2. Core space table: `venue_spaces`.
3. Capacity and taxonomy relationships: `venue_space_capacity_layouts`, `venue_space_amenities`, `venue_space_event_types`.
4. Grouped media: `venue_media_collections`, `venue_media_items`.
5. Logistics and FAQs: `venue_logistics`, `venue_faqs`.
6. Package-space relationship: `package_venue_spaces`.
7. RLS helper functions and table policies.
8. Indexes and constraints.
9. Existing-data compatibility path: no backfill required for public pages.
10. Generated database type update.
11. Static migration tests.
12. Local migration apply.
13. Live RLS verification.

Historical migration drift:

- The audit identified supplier-domain drift around older `public.suppliers` references versus current `supplier_profiles`.
- Phase 2.2 migrations should not repair unrelated drift.
- New package-space work should use current `venue_packages` and `venue_spaces`; supplier relationships remain unchanged.

Default process:

- Use Supabase migrations through the repository workflow.
- Do not apply production direct `psql` as the default.
- Verify locally before live database use.

## 25. Decisions and Trade-offs

| Decision | Evidence | Alternatives | Trade-off | Selected approach |
| --- | --- | --- | --- | --- |
| Use first-class spaces | Phase 2.1 found no current space model and benchmarks depend on spaces. | Description text or JSON. | More schema, better search and comparison. | `venue_spaces`. |
| Use revision container | Public content must stay stable while drafts change. | Row-level draft/published only. | More joins, safer publishing. | `venue_profile_revisions`. |
| Venue-scoped space slugs | Current venue slugs are global; child spaces only need venue context. | Global slugs. | Simpler URLs later, no global conflicts. | Unique within revision/venue. |
| Check-constrained text for small controlled values | Existing project uses enums, but these values may evolve during design. | PostgreSQL enums or lookup tables. | Text checks easier to adjust; less rigid than enum. | Text checks for MVP. |
| Reuse amenities/event types | Existing lookup tables already power search. | New space taxonomies. | Avoids duplicates. | Space joins to existing lookups. |
| New grouped media model | `venue_images` is venue-level only. | Overload `venue_images`. | New tables add migration work but avoid breaking current gallery. | `venue_media_collections` and `venue_media_items`. |
| Keep `venue_images` backward compatible | Existing page depends on it. | Replace immediately. | Temporary duplication risk. | New model coexists. |
| Coordinator draft edit but not publish by default | Current permissions have listing management but no publish-specific permission. | Allow coordinator publish. | Safer governance, slower owner workflow. | Owner/admin publish until approved otherwise. |
| Public reads through RLS-readable published rows | Existing public tables already use public reads. | Server-only public repositories. | RLS must be correct, but enables safe public querying. | RLS published-row reads plus server shaping. |
| Package-space relationship does not change price | Pricing semantics are already complex. | Space-specific pricing. | Less pricing power, safer MVP. | Relationship is descriptive. |
| No site-visit scheduling table | Phase 2.2 scope excludes implementation. | Add request model now. | Keeps foundation focused. | Later request workflow. |

## 26. Acceptance Criteria

Phase 2.2 implementation may be classified complete only when:

- Migrations create the approved tables, constraints, indexes, and RLS policies.
- No existing venue, booking, package, inquiry, review, favorite, or availability behavior breaks.
- Existing `/venues/[slug]` renders for venues without structured revisions.
- Public users can read published structured content only.
- Public users cannot read drafts.
- Venue owners can manage draft structured content for owned venues.
- Assigned coordinators can manage only assigned venues and only with required permissions.
- Coordinator role alone does not grant structured content access.
- Only owners/admins can publish unless stakeholder approval adds an explicit coordinator publish permission.
- Package-space relationships enforce same-venue ownership.
- Media item storage paths remain venue-owned and path-scoped.
- External URLs reject non-HTTPS and unapproved providers.
- Zod validation exists for every mutation contract.
- Repository tests cover success, failure, and authorization cases.
- RLS tests cover anonymous, customer, owner, assigned coordinator, unassigned coordinator, supplier, and admin behavior.
- Generated database types are updated after migrations.
- Local database migration apply succeeds.
- Live RLS verification is documented before release.
- Documentation is updated with final implemented names and any approved deviations.
