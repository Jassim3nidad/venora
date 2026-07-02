# Venue Profile Foundation

This document describes the reusable venue profile layout introduced for the Venora marketplace detail page. The structure follows common Airbnb listing patterns on both desktop and mobile.

## Overview

The venue profile foundation is a composable UI shell that organizes the core venue detail sections in a predictable order:

1. **Featured image section** (`VenueFeaturedGallery`)
2. **Venue profile card** (`VenueProfileCard`)
3. **Capacity information** (`VenueCapacitySection`)
4. **Description area** (`VenueDescriptionSection`)
5. **Pricing section** (`VenuePricingSection`)
6. **Booking sidebar** (existing `BookingSidebar`, slotted into the foundation)

The orchestrator component is `VenueProfileFoundation`, used by `VenueDetails` at `/venues/[slug]`.

---

## Component Map

| Component | File | Purpose |
|-----------|------|---------|
| `VenueProfileFoundation` | `ui/VenueProfileFoundation.tsx` | Composes all foundation sections |
| `VenueProfileCard` | `ui/VenueProfileCard.tsx` | Title, host, location, rating, share/save |
| `VenueFeaturedGallery` | `ui/VenueFeaturedGallery.tsx` | Featured photo + desktop grid + lightbox |
| `VenueGalleryPlaceholder` | `ui/VenueGalleryPlaceholder.tsx` | Empty hero and grid slot placeholders |
| `VenueCapacitySection` | `ui/VenueCapacitySection.tsx` | Guest range, space type, parking, accessibility |
| `VenueDescriptionSection` | `ui/VenueDescriptionSection.tsx` | About copy with Show more / Show less |
| `VenuePricingSection` | `ui/VenuePricingSection.tsx` | Base rate and package breakdown |
| `VenueMobileBookingBar` | `ui/VenueMobileBookingBar.tsx` | Sticky mobile Reserve bar |

Shared utilities live in:

- `types/venue.types.ts` — typed venue view model
- `utils/venue-media.ts` — media URL helpers and price unit formatting

---

## Airbnb-Inspired Layout

### Before

- Title and actions appeared **above** the photo gallery.
- Capacity was only a small line under the title.
- Description, pricing, and booking were mixed in a generic two-column grid without a clear profile hierarchy.
- Mobile had no sticky booking affordance.

### After

#### Desktop (≥1024px)

```
┌─────────────────────────────────────────────────────────────┐
│  [ Featured photo ]  │  [ Grid ] [ Grid ] [ Grid ] [ Grid ] │
└─────────────────────────────────────────────────────────────┘
Venue name · rating · location                    [Share] [Save]
Hosted by Organization Name
──────────────────────────────────────────────────────────────
Capacity cards (4-up)              │  Sticky BookingSidebar
About this venue (expandable)      │  (price + date + reserve)
                                   │
Pricing (mobile only below lg)     │
```

#### Mobile (<1024px)

```
┌──────────────────────────────┐
│   Full-width featured photo  │
│   [Show all]                 │
├──────────────────────────────┤
│ Horizontal photo thumbnails  │
└──────────────────────────────┘
Venue name · rating · location
[Share] [Save]
──────────────────────────────
Capacity cards (2×2 grid)
About this venue
Pricing + packages
Booking form
┌──────────────────────────────┐
│ ₱120,000/day      [Reserve]  │  ← sticky footer
└──────────────────────────────┘
```

Key Airbnb patterns applied:

- **Photos first**, profile metadata second
- **Full-bleed hero** on mobile (`-mx-4` breakout from page padding)
- **Show all photos** overlay button
- **Expandable description** with underline-style toggle
- **Sticky booking card** on desktop, **sticky bottom bar** on mobile

---

## Section Details

### 1. Venue Profile Card

**Before:** Inline header block in `VenueDetails.tsx` above the gallery.

**After:** Dedicated `VenueProfileCard` with:

- Venue name as primary heading
- Rating + review count + city/province
- Host attribution line
- Share and Save icon buttons (compact on mobile, labeled on desktop)

### 2. Featured Image Section

**Before:** `VenueGallery.tsx` monolith with shared grid for all breakpoints.

**After:** `VenueFeaturedGallery.tsx`:

- Mobile: single hero image + optional thumbnail strip
- Desktop: 1 large + 4 smaller tiles (Airbnb photo mosaic)
- Lightbox viewer with prev/next and thumbnail rail
- Uses shared `pickFeaturedMedia()` helper respecting `is_featured`

### 3. Gallery Placeholder

**Before:** Inline empty state inside `VenueGallery`.

**After:** `VenueGalleryPlaceholder` with two variants:

- `hero` — full gallery fallback when no media exists
- `slot` — dashed tile placeholder in the desktop grid

### 4. Description Area

**Before:** Static “About the Venue” paragraph always fully expanded.

**After:** `VenueDescriptionSection`:

- Airbnb-style “About this venue” heading
- Truncates long copy at ~320 characters
- “Show more” / “Show less” toggle
- Optional AI overview block preserved

### 5. Capacity Information

**Before:** Single inline line: “Up to N guests”.

**After:** `VenueCapacitySection` with four stat cards:

- Guest capacity range (min–max)
- Space type (indoor/outdoor)
- Parking availability
- Accessibility status

### 6. Pricing Section

**Before:** Pricing only visible inside `BookingSidebar`.

**After:** `VenuePricingSection`:

- Base rate with formatted currency (`formatCurrency` from `@venora/lib`)
- Package cards with inclusions preview
- Shown inline on mobile before the booking form
- Desktop relies on `BookingSidebar` for interactive pricing/booking

---

## Integration

`VenueDetails.tsx` now renders:

```tsx
<VenueProfileFoundation
  venue={venue}
  bookingSidebar={<BookingSidebar ... />}
  mobileBookingBar={<VenueMobileBookingBar ... />}
  ...
/>
```

Additional sections (amenities, map, host card, reviews, nearby venues) remain in `VenueDetails` below the foundation.

---

## Files Added / Modified

**Added**

- `types/venue.types.ts`
- `utils/venue-media.ts`
- `ui/VenueProfileFoundation.tsx`
- `ui/VenueProfileCard.tsx`
- `ui/VenueFeaturedGallery.tsx`
- `ui/VenueGalleryPlaceholder.tsx`
- `ui/VenueDescriptionSection.tsx`
- `ui/VenueCapacitySection.tsx`
- `ui/VenuePricingSection.tsx`
- `ui/VenueMobileBookingBar.tsx`
- `index.ts`

**Modified**

- `ui/VenueDetails.tsx` — uses foundation shell
- `ui/VenueGallery.tsx` — re-exports `VenueFeaturedGallery` for compatibility

---

## Verification Checklist

- [ ] `/venues/[slug]` loads with photos-first layout
- [ ] Mobile hero is full width; desktop shows 5-tile mosaic
- [ ] Empty gallery shows hero placeholder
- [ ] Profile card shows share/save and host line
- [ ] Capacity cards reflect min/max guests and amenities flags
- [ ] Long descriptions collapse with Show more
- [ ] Mobile sticky Reserve bar scrolls to booking form
- [ ] Desktop booking sidebar stays sticky while scrolling
