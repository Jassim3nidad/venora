# Venora QA Bug Report Fixes Design

## Scope

Implement the 13 documented issues and one feature in `Bug report and Feature to add.pdf`. `BUG-009` is excluded because it was already fixed and intentionally removed from the report.

Covered items:

- BUG-001: Featured venue card and destination profile identity mismatch
- BUG-002: Featured venue favorite button is not independently clickable
- BUG-003: Marketplace tabs are missing for logged-out users
- BUG-004: Cost estimator does not inherit the booking guest count
- BUG-005: Booking request page has an extra scrolling layer
- BUG-006: Venue profile package display should be removed
- BUG-007: `Venues` and `Browse` navigation labels are reversed
- BUG-008: Supplier proposal sidebar does not remain sticky
- BUG-010: Public supplier profile has an unnecessary back button
- BUG-011: Marketplace parent navigation loses its active state
- BUG-012: Marketplace subnavigation appears in Account Center
- BUG-013: Venues marketplace has no standard footer
- BUG-014: Supporting sidebar cards do not remain sticky
- FEAT-001: Landing search needs location and event-type suggestions

## Product Decisions

### Navigation

- The top-level marketplace parent is labeled `Venues`.
- `Venues` remains active for `/venues`, `/suppliers`, `/bookings`, and `/favorites`, including nested routes.
- The marketplace subnavigation is ordered `Browse`, `Suppliers`, `Bookings`, `Favorites`.
- `Browse` maps to `/venues`; every subnavigation item highlights only its own route family.
- Logged-out users see all four marketplace subnavigation items.
- Logged-out `Bookings` and `Favorites` links preserve the existing login redirect behavior.
- Account Center keeps the top-level site navigation but does not render marketplace subnavigation.

### Sticky Elements

- Result cards for venues, suppliers, bookings, and favorites scroll normally.
- Only supporting desktop sidebars are sticky: venue filters, supplier filters, venue booking panels, supplier proposal panels, and booking workflow summary panels.
- Mobile filter sheets and bottom action bars keep their existing modal/fixed behavior.
- Sticky offsets must clear both marketplace navigation rows.

### Venue Packages

- Remove `Available packages` and `Compare Packages` from the public venue profile.
- Keep configured package selection in booking controls and booking submission.
- Do not delete package data or change venue-owner package management.

### Search Suggestions

- Location suggestions come from existing marketplace venue location data.
- Event-type suggestions come from existing venue event categories.
- Suggestions open on focus or typing, filter case-insensitively, support keyboard selection, and populate the existing GET search fields.
- No new dependency or database table is needed.

## Architecture

### Marketplace Shell

Replace the viewport-locked nested scrolling model with normal document flow. The shared marketplace shell renders:

1. Top-level marketing navigation
2. Marketplace subnavigation only for marketplace route families
3. Main route content
4. Standard site footer for marketplace pages

The shell must not use `h-dvh` plus an independently scrolling main region. This removes the blank secondary scroll layer and allows CSS sticky positioning to use the document scroll container consistently.

Account Center retains its existing page footer and receives only the top-level navigation from the customer shell, preventing a duplicate footer.

### Marketplace Listings

Venue and supplier listing components stop treating the results column as a full-height scroll viewport. Their outer layouts participate in document flow. Desktop filter columns use a sticky container with a viewport-bounded height and an internal filter scroll only when their controls exceed the available space. Listing cards remain ordinary content.

### Featured Venue Cards

The landing page resolves featured records from published database venues first and uses research records only as fallback. The card's displayed identity, slug, image, location, and pricing therefore match the profile route it opens.

The favorite control is a real button and a sibling of the venue link, never an interactive child of that link. It uses the existing favorite server action, optimistic state, rollback on error, and login redirect for anonymous users.

### Guest Count Synchronization

`BookingSidebar` remains the owner of the selected guest count. It exposes that current value to its estimator child. `CostEstimatorPanel` passes the value to `CostEstimatorForm` as its initial guest count when the dialog opens. Capacity validation remains unchanged.

### Supplier Profile

The public supplier profile removes its back-to-suppliers control. Its proposal card stays in the right column and becomes sticky under the complete marketplace header stack. The same sticky offset convention is used by venue and booking sidebars.

### Search Comboboxes

A focused landing-search client component owns the two text inputs and suggestion popovers. Pure helper functions normalize, deduplicate, and filter suggestion values. The component preserves the existing `/venues` GET form contract and field names (`location` and `event`).

## Data Flow And Errors

- Published featured-venue lookup failure falls back to existing research venue data so the landing page remains usable.
- Favorite failures restore the previous visual state and display a clear notification.
- Anonymous favorite attempts redirect to login with a return path to the landing page.
- Empty suggestion lists close the popover and leave free-form input available.
- Existing Supabase authorization, RLS, booking, supplier proposal, and account logic remain unchanged.

## Testing

Automated coverage will verify:

- Top-level and secondary navigation active-state helpers
- Logged-out auth destination resolution
- Marketplace route classification and Account Center exclusion
- Featured live-record preference with research fallback
- Favorite button independence from venue-card navigation
- Cost estimator guest-count initialization
- Suggestion normalization, filtering, and selection behavior

Browser verification will cover logged-out and signed-in states at desktop, tablet, and mobile widths:

- Landing navigation, featured card destination, favorite interaction, and suggestions
- Venue profile package removal and estimator synchronization
- Booking request page with one document scrollbar
- Supplier profile back-button removal and sticky proposal card
- Venue and supplier filters remaining sticky while result cards scroll
- Correct Account Center navigation scope
- Standard footer appearing after marketplace content without becoming fixed

Final checks:

- Targeted tests
- `pnpm --filter @venora/web type-check`
- `pnpm --filter @venora/web build`
- `git grep -n -E "^(<<<<<<<|=======|>>>>>>>)"`

## Constraints

- Do not install packages.
- Do not modify `package.json` or `pnpm-lock.yaml`.
- Do not add migrations.
- Do not alter auth, RBAC, middleware, RLS, booking status values, supplier proposal workflow, or unrelated dashboards.
- Preserve mobile modal and bottom-action behavior.
