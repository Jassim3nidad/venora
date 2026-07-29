# Fixes — 2026-07-29

Event Coordinator **Managing venue listings** (brief partial → satisfied).

## Summary

Coordinators with `manage_assigned_venue_listings` can edit assigned venue
profiles, media, amenities, and packages. Create/delete venue and venue **base
price** stay owner-only.

## Changes

### Coordinator venues

- File: `apps/web/app/(venue-owner)/dashboard/coordinator/venues/page.tsx`
- “Edit listing” CTA when `manage_assigned_venue_listings` is granted
- Clear copy: manage assigned listings; create/delete remains with owner
- “Manage packages” links to `/dashboard/packages` when permitted

### Shared venue edit

- File: `apps/web/app/(venue-owner)/dashboard/venues/[id]/edit/page.tsx`
- Packages unlocked for `manage_assigned_venue_listings` (not only owners)
- Base price still owner-locked (banner updated)
- Back/Cancel → `/dashboard/coordinator/venues` for EC-only users
- Save revalidates coordinator venues + packages
- Fix: preserve `base_price` / `price_unit` when non-owner saves (select those columns)

### Packages

- Files:
  - `apps/web/app/(venue-owner)/dashboard/packages/page.tsx`
  - `apps/web/app/(venue-owner)/dashboard/packages/new/page.tsx`
  - `apps/web/app/(venue-owner)/dashboard/packages/[id]/edit/page.tsx`
  - `apps/web/src/features/venues/application/package-actions.ts`
- Role gate fixed: was checking `"coordinator"` (never matched); now
  `event_coordinator` + `manage_assigned_venue_listings`
- EC Review Venues → coordinator venues list
- Package create/update requires org membership + assignment for coordinators
- Security: org member check now filters by `user_id` (was any active member)

### Docs

- `docs/design/project-brief-role-checklist.md` — Managing venue listings `[x]`
- QA canvas `brief-qa-checklist.canvas.tsx` — EC listings marked Satisfied

## QA smoke

1. Sign in as EC with default staff permissions (includes
   `manage_assigned_venue_listings`) and assigned venues.
2. `/dashboard/coordinator/venues` → **Edit listing**.
3. Change description/media/amenities → save → success.
4. Edit an existing package on the listing (or via `/dashboard/packages`) → save.
5. Confirm base price field stays disabled.
6. Confirm EC without listing permission sees View-only messaging.
7. Confirm create venue remains unavailable on coordinator venues.

## Out of scope (intentional)

- EC create/delete venues
- EC change venue base price
- Customer-hired coordinator product (EC = org staff only)
