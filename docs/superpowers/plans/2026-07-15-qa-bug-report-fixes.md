# Venora QA Bug Report Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the 13 documented QA bugs and add accessible landing-search suggestions without changing dependencies, database schema, or unrelated business logic.

**Architecture:** Replace the marketplace's nested viewport scroll shell with normal document flow, centralize the two-level navigation rules, and keep only supporting desktop sidebars sticky. Implement landing search and favorite behavior in focused client components while reusing existing venue mapping, favorite actions, and booking state.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Supabase SSR, Vitest, Playwright.

## Global Constraints

- Do not install packages.
- Do not modify `package.json` or `pnpm-lock.yaml`.
- Do not add a database migration.
- Preserve auth, RBAC, middleware, RLS, booking statuses, supplier proposal workflow, and unrelated dashboards.
- Keep listing/result cards in normal document flow; only supporting desktop sidebars are sticky.
- Keep configured package selection in booking controls while removing public profile package comparison content.

---

## File Structure

- `apps/web/src/components/layout/marketplace-navigation.ts`: pure route labels, href resolution, and active-state helpers.
- `apps/web/src/components/layout/marketplace-navigation.test.ts`: navigation contract tests.
- `apps/web/src/components/layout/MarketingNavbar.tsx`: top-level `Venues` parent link and marketplace active state.
- `apps/web/src/components/layout/CustomerNavbar.tsx`: `Browse` secondary label and guest-visible marketplace links.
- `apps/web/src/components/layout/MarketplaceLayout.tsx`: normal document scrolling, route-aware subnav, and marketplace footer.
- `apps/web/src/lib/is-marketplace-route.ts`: marketplace route classification excluding Account Center.
- `apps/web/src/lib/is-marketplace-route.test.ts`: route classification regression coverage.
- `apps/web/src/features/venues/application/featured-venues.ts`: resolve live featured venue records with research fallback.
- `apps/web/src/features/venues/application/featured-venues.test.ts`: featured identity mapping tests.
- `apps/web/src/features/venues/ui/FeaturedVenueCard.tsx`: independent venue link and favorite button.
- `apps/web/src/features/venues/ui/LandingSegmentedSearch.tsx`: accessible location/event suggestion UI.
- `apps/web/src/features/venues/utils/landing-search-suggestions.ts`: normalize and filter search suggestions.
- `apps/web/src/features/venues/utils/landing-search-suggestions.test.ts`: search suggestion tests.
- `apps/web/app/(marketing)/page.tsx`: load live featured venue/favorite state and render focused landing components.
- `apps/web/src/features/venues/ui/BookingSidebar.tsx`: expose the selected guest count to estimator content.
- `apps/web/src/features/ai/ui/CostEstimatorPanel.tsx`: accept selected guest count.
- `apps/web/src/features/ai/ui/CostEstimatorForm.tsx`: initialize the guest field from selected booking state.
- `apps/web/src/features/ai/ui/cost-estimator-form.test.ts`: initial guest-count contract tests.
- `apps/web/src/features/venues/ui/VenueDetails.tsx`: remove package display/compare section and pass guest state into estimator.
- `apps/web/src/features/venues/ui/VenuesClient.tsx`: document-flow results and sticky desktop filters.
- `apps/web/src/features/suppliers/ui/SuppliersMarketplaceClient.tsx`: document-flow results and sticky desktop filters.
- `apps/web/src/features/suppliers/ui/SupplierDetail.tsx`: remove back control and preserve sticky proposal card.
- `apps/web/app/(customer)/venues/page.tsx`: remove viewport-locking wrappers.
- `apps/web/e2e/qa/marketplace-qa.spec.ts`: browser-level navigation, scrolling, footer, and landing interaction regression coverage.

---

### Task 1: Navigation Contract And Account Scoping

**Files:**
- Create: `apps/web/src/components/layout/marketplace-navigation.ts`
- Create: `apps/web/src/components/layout/marketplace-navigation.test.ts`
- Create: `apps/web/src/lib/is-marketplace-route.test.ts`
- Modify: `apps/web/src/lib/is-marketplace-route.ts`
- Modify: `apps/web/src/components/layout/MarketingNavbar.tsx`
- Modify: `apps/web/src/components/layout/CustomerNavbar.tsx`

**Interfaces:**
- Produces: `MARKETPLACE_NAV_LINKS`, `isMarketplaceParentActive(pathname)`, `isMarketplaceNavItemActive(pathname, href)`, and `resolveMarketplaceNavHref(href, isAuthenticated)`.
- Consumed by: `MarketingNavbar`, `CustomerNavbar`, and Task 2 shell routing.

- [ ] **Step 1: Write failing navigation tests**

```ts
import { describe, expect, it } from "vitest";
import {
  isMarketplaceNavItemActive,
  isMarketplaceParentActive,
  resolveMarketplaceNavHref,
} from "./marketplace-navigation";

describe("marketplace navigation", () => {
  it.each(["/venues", "/suppliers/qa-supplier", "/bookings", "/favorites"])(
    "keeps the Venues parent active for %s",
    (pathname) => expect(isMarketplaceParentActive(pathname)).toBe(true),
  );

  it("uses Browse only for venue routes", () => {
    expect(isMarketplaceNavItemActive("/venues/example", "/venues")).toBe(true);
    expect(isMarketplaceNavItemActive("/suppliers", "/venues")).toBe(false);
  });

  it("redirects anonymous auth-only tabs to login", () => {
    expect(resolveMarketplaceNavHref("/bookings", false)).toContain("/login?");
    expect(resolveMarketplaceNavHref("/favorites", false)).toContain("/login?");
    expect(resolveMarketplaceNavHref("/suppliers", false)).toBe("/suppliers");
  });
});
```

Add route tests proving `/account` is not a marketplace subnavigation route while `/venues`, `/suppliers`, `/bookings`, and `/favorites` are.

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
pnpm --config.verify-deps-before-run=false --filter @venora/web exec vitest run src/components/layout/marketplace-navigation.test.ts src/lib/is-marketplace-route.test.ts
```

Expected: FAIL because the navigation helper module and Account Center exclusion do not exist.

- [ ] **Step 3: Implement the pure navigation contract**

```ts
export const MARKETPLACE_NAV_LINKS = [
  { label: "Browse", href: "/venues" },
  { label: "Suppliers", href: "/suppliers" },
  { label: "Bookings", href: "/bookings" },
  { label: "Favorites", href: "/favorites" },
] as const;

const MARKETPLACE_PREFIXES = MARKETPLACE_NAV_LINKS.map((item) => item.href);

export function isMarketplaceParentActive(pathname: string) {
  return MARKETPLACE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
```

Move the existing auth redirect behavior into `resolveMarketplaceNavHref`. Update the top-level navbar label from `Browse` to `Venues`, use the parent helper, and update the secondary first label from `Venues` to `Browse`. Keep all four secondary links visible for guests.

- [ ] **Step 4: Verify GREEN**

Run the Task 1 Vitest command. Expected: all tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add apps/web/src/components/layout apps/web/src/lib/is-marketplace-route.ts apps/web/src/lib/is-marketplace-route.test.ts
git commit -m "fix(web): correct marketplace navigation"
```

---

### Task 2: Document Scrolling, Footer, And Sticky Sidebars

**Files:**
- Modify: `apps/web/src/components/layout/MarketplaceLayout.tsx`
- Modify: `apps/web/app/(customer)/venues/page.tsx`
- Modify: `apps/web/src/features/venues/ui/VenuesClient.tsx`
- Modify: `apps/web/src/features/suppliers/ui/SuppliersMarketplaceClient.tsx`
- Create: `apps/web/e2e/qa/marketplace-qa.spec.ts`

**Interfaces:**
- Consumes: Task 1 marketplace route helpers.
- Produces: one document scrollbar, route-scoped secondary navigation, a normal-flow footer, and sticky desktop filter columns.

- [ ] **Step 1: Add a failing shell regression test**

```ts
import { expect, test } from "@playwright/test";

test("marketplace uses document scrolling and renders a normal-flow footer", async ({ page }) => {
  await page.goto("/venues");
  await expect(page.getByRole("link", { name: "Browse", exact: true })).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();

  const shell = page.getByTestId("marketplace-shell");
  await expect(shell).not.toHaveCSS("height", `${await page.evaluate(() => innerHeight)}px`);
  await expect(page.locator("html")).not.toHaveCSS("overflow-y", "hidden");
});
```

Add assertions that `/account` has no `Marketplace navigation`, and that venue/supplier result cards move during page scroll while their filter aside remains at a stable viewport top on desktop.

- [ ] **Step 2: Run the focused Playwright test and verify RED**

Run against the isolated worktree server:

```powershell
pnpm --config.verify-deps-before-run=false --filter @venora/web exec playwright test e2e/qa/marketplace-qa.spec.ts --project=chromium
```

Expected: FAIL because the shell is `h-dvh overflow-hidden`, `/account` receives subnavigation, and marketplace footer is missing.

- [ ] **Step 3: Normalize the shared shell**

Use this structure:

```tsx
<div data-testid="marketplace-shell" className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#111827]">
  <div className="sticky top-0 z-50 shrink-0">
    <MarketingNavbar embedded />
    {showMarketplaceSubnav ? <CustomerNavbar user={user ?? null} profile={profile ?? null} variant="subnav" /> : null}
  </div>
  <main className="flex min-w-0 flex-1 flex-col">{children}</main>
  {showMarketplaceSubnav ? <SiteFooter /> : null}
</div>
```

Account Center continues using its own footer. Remove `h-dvh`, shell-level `overflow-hidden`, and the independently scrolling main region.

- [ ] **Step 4: Convert listing pages to document flow**

Replace full-height result containers with ordinary layouts. Desktop asides use:

```tsx
className="hidden shrink-0 lg:sticky lg:top-[9.5rem] lg:block lg:max-h-[calc(100dvh-10.5rem)] lg:self-start lg:overflow-hidden"
```

The filter panel may keep its own bounded internal scroll. Results `<main>` must not use `h-full overflow-y-auto`. Remove the viewport-locking wrappers from `venues/page.tsx`.

- [ ] **Step 5: Verify shell behavior**

Run Task 2 Playwright test. Expected: PASS at desktop and mobile projects supported by the existing config.

- [ ] **Step 6: Commit**

```powershell
git add apps/web/src/components/layout/MarketplaceLayout.tsx apps/web/app/'(customer)'/venues/page.tsx apps/web/src/features/venues/ui/VenuesClient.tsx apps/web/src/features/suppliers/ui/SuppliersMarketplaceClient.tsx apps/web/e2e/qa/marketplace-qa.spec.ts
git commit -m "fix(web): normalize marketplace scrolling"
```

---

### Task 3: Featured Venue Identity And Favorite Interaction

**Files:**
- Create: `apps/web/src/features/venues/application/featured-venues.ts`
- Create: `apps/web/src/features/venues/application/featured-venues.test.ts`
- Create: `apps/web/src/features/venues/ui/FeaturedVenueCard.tsx`
- Modify: `apps/web/app/(marketing)/page.tsx`
- Modify: `apps/web/e2e/qa/marketplace-qa.spec.ts`

**Interfaces:**
- Produces: `resolveFeaturedMarketplaceVenues(liveVenues, fallbackVenues)` and `FeaturedVenueCard`.
- Consumes: existing `searchMarketplaceVenues`, `toLiveMarketplaceVenue`, `toggleFavoriteAction`, and research venue records.

- [ ] **Step 1: Write failing identity-resolution tests**

```ts
it("prefers a published live venue identity over research fallback", () => {
  const result = resolveFeaturedMarketplaceVenues(
    [{ id: "venue-1", slug: "live-slug", name: "Live Venue" } as Venue],
    [{ id: "venue-1", slug: "research-slug", name: "Research Venue" } as Venue],
  );

  expect(result[0]).toMatchObject({ name: "Live Venue", slug: "live-slug" });
});

it("uses research data when a live row is missing", () => {
  expect(resolveFeaturedMarketplaceVenues([], [fallbackVenue])).toEqual([fallbackVenue]);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
pnpm --config.verify-deps-before-run=false --filter @venora/web exec vitest run src/features/venues/application/featured-venues.test.ts
```

Expected: FAIL because the resolver does not exist.

- [ ] **Step 3: Implement live-first featured resolution**

Resolve the three featured research IDs in research order. When an ID exists in the published query result, use the complete mapped live venue; otherwise retain the mapped research venue. Fetch the signed-in user's existing favorite IDs with the same pattern used by `/venues`.

- [ ] **Step 4: Build an independent favorite button**

Render the card as an `<article>` with a venue `<Link>` and a sibling favorite `<button>` layered above it. The button uses optimistic state and `toggleFavoriteAction`; anonymous clicks call:

```ts
router.push("/login?redirectTo=%2F&prompt=favorites");
```

It must have `aria-pressed`, an explicit accessible name, and must not trigger the venue link.

- [ ] **Step 5: Extend browser coverage**

Assert that the first featured card heading equals its destination H1. Assert that clicking the anonymous favorite button navigates to login, not to `/venues/[slug]`.

- [ ] **Step 6: Verify and commit**

Run the Task 3 unit test and focused Playwright file, then commit:

```powershell
git add apps/web/app/'(marketing)'/page.tsx apps/web/src/features/venues/application/featured-venues.ts apps/web/src/features/venues/application/featured-venues.test.ts apps/web/src/features/venues/ui/FeaturedVenueCard.tsx apps/web/e2e/qa/marketplace-qa.spec.ts
git commit -m "fix(web): align featured venue cards"
```

---

### Task 4: Landing Search Suggestions

**Files:**
- Create: `apps/web/src/features/venues/utils/landing-search-suggestions.ts`
- Create: `apps/web/src/features/venues/utils/landing-search-suggestions.test.ts`
- Create: `apps/web/src/features/venues/ui/LandingSegmentedSearch.tsx`
- Modify: `apps/web/app/(marketing)/page.tsx`
- Modify: `apps/web/e2e/qa/marketplace-qa.spec.ts`

**Interfaces:**
- Produces: `buildLandingSearchSuggestions(venues)`, `filterLandingSearchSuggestions(options, query)`, and `LandingSegmentedSearch`.
- Consumes: mapped marketplace venue `location` and `eventTypes` fields.

- [ ] **Step 1: Write failing suggestion helper tests**

```ts
it("deduplicates and sorts location and event suggestions", () => {
  const result = buildLandingSearchSuggestions([
    { location: "Tagaytay, Cavite", eventTypes: ["Wedding", "Corporate"] },
    { location: "tagaytay, cavite", eventTypes: ["Wedding"] },
  ]);

  expect(result.locations).toEqual(["Tagaytay, Cavite"]);
  expect(result.eventTypes).toEqual(["Corporate", "Wedding"]);
});

it("filters suggestions case-insensitively", () => {
  expect(filterLandingSearchSuggestions(["Wedding", "Corporate"], "wed")).toEqual(["Wedding"]);
});
```

- [ ] **Step 2: Run and verify RED**

Run the new Vitest file. Expected: FAIL because helpers do not exist.

- [ ] **Step 3: Implement helpers and combobox UI**

The component preserves the existing GET form:

```tsx
<form action="/venues" method="GET">
  <SuggestionInput name="location" label="Location" options={locations} />
  <SuggestionInput name="event" label="Event Type" options={eventTypes} />
  <button type="submit">Search</button>
</form>
```

Each input uses `role="combobox"`, `aria-expanded`, `aria-controls`, a `role="listbox"`, and keyboard handling for ArrowDown, ArrowUp, Enter, Escape, and Tab. Free-form values remain valid.

- [ ] **Step 4: Add browser assertions**

On focus, suggestions appear. Typing narrows options. Clicking or pressing Enter populates the field. Submitting preserves `location` and `event` query parameters.

- [ ] **Step 5: Verify and commit**

Run helper tests and focused Playwright coverage, then commit:

```powershell
git add apps/web/app/'(marketing)'/page.tsx apps/web/src/features/venues/ui/LandingSegmentedSearch.tsx apps/web/src/features/venues/utils/landing-search-suggestions.ts apps/web/src/features/venues/utils/landing-search-suggestions.test.ts apps/web/e2e/qa/marketplace-qa.spec.ts
git commit -m "feat(web): add landing search suggestions"
```

---

### Task 5: Guest Count Synchronization And Package Display Removal

**Files:**
- Create: `apps/web/src/features/ai/ui/cost-estimator-form.test.ts`
- Modify: `apps/web/src/features/venues/ui/BookingSidebar.tsx`
- Modify: `apps/web/src/features/ai/ui/CostEstimatorPanel.tsx`
- Modify: `apps/web/src/features/ai/ui/CostEstimatorForm.tsx`
- Modify: `apps/web/src/features/venues/ui/VenueDetails.tsx`
- Modify: `apps/web/e2e/qa/marketplace-qa.spec.ts`

**Interfaces:**
- `BookingSidebar.children`: `ReactNode | ((guestCount: number) => ReactNode)`.
- `CostEstimatorPanel.initialGuestCount?: number`.
- `CostEstimatorForm.initialGuestCount?: number`.

- [ ] **Step 1: Write a failing initial-value test**

Export a pure default builder and test it:

```ts
expect(
  getCostEstimatorDefaultValues({ initialGuestCount: 200, capacityMin: 50 }),
).toMatchObject({ guestCount: 200 });

expect(
  getCostEstimatorDefaultValues({ capacityMin: 50 }),
).toMatchObject({ guestCount: 50 });
```

- [ ] **Step 2: Run and verify RED**

Run the new Vitest file. Expected: FAIL because the default builder and initial guest prop do not exist.

- [ ] **Step 3: Thread the live guest count into the estimator**

Render function children inside `BookingSidebar`:

```tsx
{typeof children === "function" ? children(guests) : children}
```

Pass `initialGuestCount={guests}` from `VenueDetails` to `CostEstimatorPanel`, and use it before `capacityMin` in form defaults.

- [ ] **Step 4: Remove only public package display content**

Remove `VenuePricingSection` and `PackageComparePicker` imports and render calls from `VenueDetails`. Keep `activePackages` and `packages={activePackages}` for `BookingSidebar`.

- [ ] **Step 5: Extend browser coverage**

Set the booking guest count to `200`, open `Estimate Event Cost`, and assert the estimator guest input is `200`. Assert the venue profile no longer contains `Available packages` or `Compare Packages`, while the booking control still exposes configured package selection when available.

- [ ] **Step 6: Verify and commit**

Run the cost-estimator test and focused Playwright file, then commit:

```powershell
git add apps/web/src/features/ai/ui apps/web/src/features/venues/ui/BookingSidebar.tsx apps/web/src/features/venues/ui/VenueDetails.tsx apps/web/e2e/qa/marketplace-qa.spec.ts
git commit -m "fix(web): sync venue estimate guests"
```

---

### Task 6: Supplier Profile Cleanup And Sticky Supporting Cards

**Files:**
- Modify: `apps/web/src/features/suppliers/ui/SupplierDetail.tsx`
- Modify: `apps/web/src/features/venues/ui/BookingSidebar.tsx`
- Modify: `apps/web/app/(customer)/venues/[slug]/book/page.tsx`
- Modify: `apps/web/e2e/qa/marketplace-qa.spec.ts`

**Interfaces:**
- Consumes: Task 2 document-scroll shell and shared `top-[9.5rem]` desktop offset convention.
- Produces: sticky proposal, booking, and workflow cards with no supplier back button.

- [ ] **Step 1: Add failing browser assertions**

Assert the public supplier profile has no `Back to suppliers` link. At desktop width, record the proposal card's top position, scroll the document, and assert the card remains below the header stack. Repeat for the venue booking sidebar and booking-request workflow summary card.

- [ ] **Step 2: Run and verify RED**

Run the focused Playwright file. Expected: supplier back-link assertion fails and sticky positions are inconsistent with the complete header height.

- [ ] **Step 3: Apply the scoped UI corrections**

Remove only the public supplier back link. Standardize supporting desktop cards on:

```tsx
className="lg:sticky lg:top-[9.5rem] lg:self-start"
```

Do not add sticky positioning to result cards or mobile cards.

- [ ] **Step 4: Verify and commit**

Run focused Playwright coverage, then commit:

```powershell
git add apps/web/src/features/suppliers/ui/SupplierDetail.tsx apps/web/src/features/venues/ui/BookingSidebar.tsx apps/web/app/'(customer)'/venues/'[slug]'/book/page.tsx apps/web/e2e/qa/marketplace-qa.spec.ts
git commit -m "fix(web): keep supporting cards sticky"
```

---

### Task 7: Responsive Browser Audit And Final Regression Checks

**Files:**
- Modify only files from Tasks 1-6 if the audit identifies a verified regression.

**Interfaces:**
- Produces: verified desktop, tablet, and mobile behavior with no new scrolling or navigation regressions.

- [ ] **Step 1: Run all new tests**

```powershell
pnpm --config.verify-deps-before-run=false --filter @venora/web exec vitest run src/components/layout/marketplace-navigation.test.ts src/lib/is-marketplace-route.test.ts src/features/venues/application/featured-venues.test.ts src/features/venues/utils/landing-search-suggestions.test.ts src/features/ai/ui/cost-estimator-form.test.ts
pnpm --config.verify-deps-before-run=false --filter @venora/web exec playwright test e2e/qa/marketplace-qa.spec.ts
```

Expected: all PASS.

- [ ] **Step 2: Audit in the in-app browser**

Verify at desktop (`1440x900`), tablet (`768x1024`), and mobile (`390x844`):

- `/`
- `/venues`
- the first featured `/venues/[slug]`
- `/venues/[slug]/book` with an authenticated customer
- `/suppliers`
- the first `/suppliers/[slug]`
- `/bookings`
- `/favorites`
- `/account`

Inspect each page from top to footer. Confirm no blank fixed layer, no secondary document scrollbar, no footer covering content, no clipped controls, and no sticky result cards.

- [ ] **Step 3: Run static checks**

```powershell
pnpm --config.verify-deps-before-run=false --filter @venora/web type-check
pnpm --config.verify-deps-before-run=false --filter @venora/web build
git grep -n -E "^(<<<<<<<|=======|>>>>>>>)"
git diff --check
```

Expected: type-check PASS, build PASS, no conflict markers, and clean diff check.

- [ ] **Step 4: Review the complete diff**

Confirm no changes to `package.json`, `pnpm-lock.yaml`, migrations, auth, middleware, RBAC, or unrelated routes. Confirm `BUG-009` code remains untouched.

- [ ] **Step 5: Commit any audit-only correction**

Only if Step 2 required a verified correction:

```powershell
git add apps/web/src/components/layout apps/web/src/features/venues apps/web/src/features/suppliers apps/web/src/features/ai/ui apps/web/app/'(customer)' apps/web/app/'(marketing)'/page.tsx apps/web/e2e/qa/marketplace-qa.spec.ts
git commit -m "fix(web): finish marketplace QA audit"
```
