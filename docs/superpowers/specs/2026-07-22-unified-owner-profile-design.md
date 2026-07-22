# Unified Owner Profile Design

## Goal

Make the venue owner business profile editor feed the customer-facing owner profile at `/owners/[slug]` so venue owners edit the same information customers actually see.

## Current Problem

Venora has two separate owner profile surfaces:

- `/dashboard/business-profile` edits `business_profiles` and publishes snapshots for `/partners/[slug]`.
- `/owners/[slug]` reads organization, venue, booking, and review data through public owner RPCs.

Because `/owners/[slug]` ignores the published business profile snapshot, fields such as display name, tagline, logo, cover image, about text, public contact details, and website do not appear on the real customer-facing owner page.

## Canonical Route

`/owners/[slug]` is the canonical customer-facing venue owner profile.

`/partners/[slug]` remains as a legacy compatibility route and should redirect to `/owners/[slug]` when possible.

The dashboard editor and preview should use owner language and owner URLs:

- Prefix text: `venora.ph/owners/`
- Preview/published links: `/owners/[slug]`
- Revalidation target: `/owners/[slug]`

## Public Data Model

The public owner profile should combine two data sources:

- Derived trust data already used by `/owners/[slug]`: verification, venue count, completed bookings, rating, reviews, service area, venue cards.
- Published business profile snapshot data: display name, tagline, logo, cover image, short description, about, year established, city/province, public email, public phone, website.

The published snapshot is the only business profile source used by public customer pages. Draft-only edits remain private until published.

## Field Mapping

- `displayName` overrides the organization name on public owner pages.
- `tagline` appears as the hero subtitle when published.
- `logoPath` appears as the avatar when published; initials remain fallback.
- `coverImagePath` appears as the hero cover when published; the existing visual fallback remains.
- `shortDescription` appears as concise intro copy.
- `about` appears in the About section.
- `yearEstablished` appears as an established stat when available.
- `city`, `province`, and `countryCode` appear only when address visibility allows location data.
- `publicEmail` appears only when email visibility is enabled.
- `publicPhone` appears only when phone visibility is enabled.
- `websiteUrl` appears when provided.
- `legal_name`, `private_address`, hidden email, and hidden phone are never exposed.

## Database / Security

Use the existing `business_profiles` and `business_profile_publications` tables. Do not create duplicate profile tables.

Update the existing public owner RPCs so they return sanitized published profile fields from `business_profile_publications.snapshot` for the owning organization. Preserve the current public derived stats from organizations, venues, bookings, and reviews.

Do not expose draft rows directly to anon users. Do not use service-role keys in client components. Keep function grants scoped to `anon` and `authenticated` only where they are already public owner-profile API functions.

## UI Behavior

`/owners/[slug]` keeps its current marketplace profile layout, venue cards, and review sections. It should add or replace copy using the published business fields without turning into the generic partner page.

If no published business profile exists, `/owners/[slug]` still renders from existing organization-derived data.

The dashboard editor should clarify what is public:

- Display Name: visible on owner profile.
- Legal Business Name: private/account record.
- Slug: owner profile URL.
- Logo/Cover: public owner profile images.
- Address/contact visibility controls: determine public owner profile display.

## Revalidation

Saving drafts revalidates `/dashboard/business-profile`.

Publishing revalidates:

- `/dashboard/business-profile`
- `/dashboard/business-profile/preview`
- `/owners/[slug]`
- `/partners/[slug]` for legacy compatibility

## Testing

Add tests for owner profile normalization so published business fields map correctly and private fields are absent.

Add route tests to keep `/owners/[slug]` treated as a marketplace route and `/partners/[slug]` redirect-compatible.

Run:

- `pnpm --filter @venora/web test -- src/lib/is-marketplace-route.test.ts`
- `pnpm --filter @venora/web type-check`
- `git grep -n -E "^(<<<<<<<|=======|>>>>>>>)"`

## Browser Verification

Verify with `owner@venora.local / owner123`:

- `/dashboard/business-profile` shows owner-profile URL language.
- The preview opens the owner profile route.
- Published business profile fields appear on `/owners/venora-research-venue-network`.
- Hidden contact/address fields do not appear.
- Desktop, tablet, and mobile layouts have no overlap or horizontal overflow.
