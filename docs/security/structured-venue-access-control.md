# Structured Venue Access Control

Status: static policy and contract coverage implemented; live local RLS verification blocked by unavailable Docker engine on 2026-07-31.

## Boundary

Structured venue data inherits ownership from `venues.organization_id`.

Key helpers:

- `public.can_manage_venue_structured_content(uuid)`
- `public.can_preview_venue_structured_content(uuid)`
- `public.can_publish_venue_structured_content(uuid)`
- `public.structured_revision_allows_draft_write(uuid, uuid)`
- `public.structured_revision_allows_publish(uuid, uuid)`
- `public.structured_space_allows_draft_write(uuid)`
- `public.structured_space_allows_preview(uuid)`
- `public.structured_media_collection_allows_draft_write(uuid)`
- `public.structured_media_collection_allows_preview(uuid)`
- `public.structured_media_path_belongs_to_venue(uuid, text)`

All helper functions are `SECURITY DEFINER` with explicit `search_path = public, pg_catalog`.

## Public Access

Anonymous, customers, suppliers, and authenticated users may read only published structured content.

Public RLS policies require:

- Published revision status.
- Published child status where child rows have status.
- Approved, non-deleted media item metadata.
- Active package and published space/revision for package-space rows.

Draft and archived structured content is not public-readable.

## Venue Owner Access

Venue owners can:

- Create and update draft revisions for venues owned through their organization.
- Manage spaces, layouts, space taxonomy links, media metadata, logistics, FAQs, and package-space relationships for their own venues.
- Publish their own structured draft revisions.
- Preview structured draft content for their own venues.

Venue owners cannot manage another organization venue.

## Coordinator Access

Coordinators require all of:

- `organization_members.role = 'coordinator'`
- `organization_members.status = 'active'`
- `venue_coordinator_assignments` row for the venue.
- Explicit permission in `organization_members.permissions`.

Permissions:

- `view_assigned_venues` allows preview access.
- `manage_assigned_venue_listings` allows draft management.
- Coordinators cannot publish structured revisions.

## Admin Access

The structured helpers reuse the existing `public.is_admin()` convention. No browser-side admin bypass was added.

## Media Path Strategy

Structured media metadata must use the existing venue bucket path convention:

`{organization_id}/{venue_id}/{filename}`

The write policies call `public.structured_media_path_belongs_to_venue(venue_id, storage_path)` so media metadata cannot be attached to the wrong organization or venue path.

## RLS Verification Status

Static migration tests cover policy presence and helper definitions. Live local RLS execution is still required before classifying Phase 2.2 as fully live verified.

Blocked local commands:

- `supabase status`
- `supabase start`
- `docker ps --format "table {{.Names}}\t{{.Status}}"`

Blocking reason:

- Docker Desktop Linux engine pipe was unavailable: `//./pipe/dockerDesktopLinuxEngine`.

No remote or production database was used.
