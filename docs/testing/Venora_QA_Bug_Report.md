# Venora — QA Bug Report

**Project:** Venora (Venue & Supplier Booking Platform)
**Document Type:** QA Bug Report
**Date:** July 15, 2026 (updated July 21, 2026)
**Prepared by:** Sai
**Status:** Open — For Review / Fix

---

## Summary

This document logs bugs and UI/UX issues identified during QA testing of the Venora platform, covering the landing page, navigation, venue profile pages, supplier profile pages, booking flow, and account center. It also tracks features planned for future implementation and fixes shipped after the July 20 manual QA pass.

**Total Issues Logged:** 22

| Severity | Count |
| -------- | ----- |
| Critical | 3     |
| High     | 4     |
| Medium   | 9     |
| Low      | 6     |

| Fix status (selected)         | Count                  |
| ----------------------------- | ---------------------- |
| Implemented (FIX-001–FIX-011) | 11                     |
| Still open from BUG-017+      | See open backlog below |

---

## Bug Log

### BUG-001 — Mismatched Card Name and Venue Profile Name

- **Severity:** High
- **Area:** Landing Page — Featured Venues Section
- **Description:** The featured venue card labeled "The Blue Leaf Filipinas" links to a venue profile page displaying a different name: "Lyceum of the Philippines University - Cavite."
- **Expected Result:** The card name should match the venue profile it links to.
- **Actual Result:** Card name and destination profile name do not correspond, causing confusion about which venue is being viewed.

---

### BUG-002 — Favorite Button Not Clickable on Featured Venue Cards

- **Severity:** Medium
- **Area:** Landing Page — Featured Venues Section
- **Description:** The favorite (heart/bookmark) icon on featured venue cards cannot be clicked independently.
- **Expected Result:** Clicking the favorite button should toggle the favorite state without triggering navigation.
- **Actual Result:** The button is unresponsive; clicking anywhere on the card, including the favorite icon, redirects to the venue profile page instead.

---

### BUG-003 — Navigation List Missing Key Tabs When Logged Out

- **Severity:** Medium
- **Area:** Global Navigation
- **Description:** The Venue, Supplier, Bookings, and Favorite tabs are not available in the navigation bar when the user is logged out.
- **Expected Result:** Define intended behavior — either these tabs should remain visible (possibly prompting login on click) or a clear alternate state should be shown. Current absence may block discoverability for new/guest users.
- **Actual Result:** Tabs are missing entirely from the nav bar in the logged-out state.

---

### BUG-004 — Estimate Event Cost Guest Count Not Syncing with User Input

- **Severity:** Medium
- **Area:** Venue Profile Page — Estimate Event Cost Pop-up
- **Description:** The guest capacity field in the "Estimate Event Cost" pop-up does not reflect the guest count the user already entered in the booking menu.
- **Steps to Reproduce:**
  1. Go to a venue profile page.
  2. Enter a guest count in the booking menu (e.g., 200).
  3. Open the "Estimate Event Cost" pop-up.
- **Expected Result:** Guest capacity field should pre-fill with the previously entered value (e.g., 200).
- **Actual Result:** Field resets to the default value (e.g., 50) instead of syncing with prior input.

---

### BUG-005 — Extra Scrollbar on Booking Request Page

- **Severity:** Low
- **Area:** Booking Request Page
- **Description:** An additional scrollbar layer appears on the page, rendering as a blank white overlay that scrolls independently all the way down.
- **Expected Result:** Only a single, standard page scrollbar should be present.
- **Actual Result:** A secondary scrollable blank layer appears alongside the main content.

---

### BUG-006 — Venue Profile Package Options Do Not Make Sense

- **Severity:** Low
- **Area:** Venue Profile Page
- **Description:** The package options section on the venue profile page displays content/logic that does not make sense in context.
- **Expected Result:** Per product decision, this section should be removed.
- **Actual Result:** Section is still present and displaying unclear/invalid content.
- **Recommendation:** Remove the package options section entirely.

---

### BUG-007 — Incorrect Order of "Venue" and "Browse" in Navigation List

- **Severity:** Low
- **Area:** Global Navigation
- **Description:** The nav list currently orders items with "Browse" and "Venue" in the wrong sequence.
- **Expected Result:** "Venue" and "Browse" should be swapped in the navigation order.
- **Actual Result:** Current order does not match intended layout.

---

### BUG-008 — Supplier Proposal Section Scrolls Instead of Sticking

- **Severity:** Medium
- **Area:** Supplier Profile Page — Proposal Section
- **Description:** The proposal section scrolls along with the rest of the page content.
- **Expected Result:** The proposal section should use sticky positioning and remain fixed in view as the user scrolls.
- **Actual Result:** Section follows normal scroll behavior instead of sticking.

---

### BUG-009 — False Validation Error on Proposal Request Submission

- **Severity:** Critical
- **Area:** Supplier Profile Page — Proposal Request Form
- **Description:** Submitting a proposal request triggers a failure message referencing fields ("contactName," "contactEmail") that are not present anywhere in the proposal request section.
- **Error Message Received:** "Request Failed: Invalid Input. Please check the highlighted fields. Details: contactName: Name is required, contactEmail: Enter a valid email"
- **Expected Result:** Form should validate only against fields actually present in the UI, and submission should succeed when all visible required fields are correctly filled.
- **Actual Result:** Submission fails due to validation errors on fields that don't exist in the visible form, blocking users from completing proposal requests.
- **Impact:** This blocks a core user flow (sending proposal requests to suppliers) and should be prioritized for immediate fix.

---

### BUG-010 — "Back to Supplier" Button Should Be Removed

- **Severity:** Low
- **Area:** Supplier Profile Page
- **Description:** The "Back to Supplier" button is present on the supplier profile page but is not needed.
- **Expected Result:** Per product decision, this button should be removed.
- **Actual Result:** Button is still present on the page.

---

### BUG-011 — "Venues" Nav Highlight Disappears When Switching Tabs

- **Severity:** Medium
- **Area:** Global Navigation
- **Description:** When a user is on the Venues page and switches to Supplier, Bookings, or Favorites, the "Venues" nav item loses its highlighted/active state, and only "Browse" gets highlighted instead.
- **Expected Result:** Navigation should reflect the correct active state — "Venues" should remain highlighted when relevant, not just default to "Browse."
- **Actual Result:** Highlight state is lost / defaults incorrectly to "Browse."

---

### BUG-012 — Venue-Specific Nav Tabs Appear in Account Center

- **Severity:** Medium
- **Area:** Account Center
- **Description:** The Browse, Suppliers, Bookings, and Favorites tabs appear in the Account Center navigation, but should be scoped only to the Venues section.
- **Expected Result:** These tabs should only display when the user is within the Venues section, not in Account Center.
- **Actual Result:** All four tabs are visible in Account Center regardless of context.

---

### BUG-013 — Footer Missing on Venues Page

- **Severity:** Low
- **Area:** Venues Page
- **Description:** The Venues page does not display a footer, unlike other pages on the platform.
- **Expected Result:** The Venues page should include the standard site footer.
- **Actual Result:** No footer is present on the page.

---

### BUG-014 — Cards Not Sticking on Scroll Across Pages and Tabs

- **Severity:** Medium
- **Area:** Global — All Pages/Tabs (Venues, Supplier, Bookings, Favorites)
- **Description:** Cards on all pages and tabs currently scroll along with the page content instead of remaining fixed in place.
- **Expected Result:** Cards should stick in position on the page and not follow/scroll as the user scrolls down.
- **Actual Result:** Cards move with the page scroll rather than sticking.
- **Note:** This may be related to BUG-008 (supplier proposal section also not sticking) — could share the same root cause in scroll/positioning behavior.

---

## Features To Be Added

### FEAT-001 — Dropdown Suggestions for Segmented Search (Location and Event Type)

- **Area:** Landing Page — Segmented Search
- **Description:** The Location and Event Type fields in the segmented search bar should offer dropdown suggestions as the user types or clicks into the field.
- **Expected Behavior:** Clicking or typing into the Location field should show a dropdown of matching/suggested locations; clicking or typing into the Event Type field should show a dropdown of available event type options. Selecting a suggestion should populate the field.
- **Current Behavior:** No dropdown suggestions are present for either field.

---

### BUG-015 — Billing Documents Card Overlapped and Cut Off on Payment Page

- **Severity:** Medium
- **Area:** Payment Page — Billing Documents Card
- **Description:** When paying a deposit on the Payment page, the "Billing Documents" card is overlapped and its content is cut off, with text (e.g., the venue/reservation name) extending beyond the visible card boundary.
- **Steps to Reproduce:**
  1. Go to the Payment page to pay a deposit.
  2. View the "Billing Documents" card.
- **Expected Result:** Card content should be fully contained within the card, with no overlap or text cutoff.
- **Actual Result:** Card is cut off/overlapped, as shown in the attached reference image.
- **Reference:** See attached screenshot (Billing Documents card, invoice INV-2026-000017).

---

### BUG-016 — "PayMongo" Payment Provider Unavailable Error

- **Severity:** High
- **Area:** Payment Page — Payment Method Selection
- **Description:** Attempting to pay via the PayMongo payment method returns an error stating the provider is not available.
- **Error Message Received:** "Payment provider 'paymongo' is not available yet. Please choose another payment method."
- **Expected Result:** PayMongo should either be fully functional as a payment method, or should not be shown/selectable as an option if not yet supported.
- **Actual Result:** PayMongo is presented as a payment option but fails when selected, blocking payment completion via this method.

---

## Fixes Implemented

### FIX-001 — Environment Setup (Supabase Variables)

- **Area:** Local Development Environment
- **Description:** Identified that Next.js reads environment variables from `apps/web/.env.local` rather than the root `.env`, which was causing missing Supabase variables. Created and configured the correct local web environment file. Documented secure Vercel setup for Supabase and PayMongo keys, ensuring secrets are kept out of Git/GitHub.
- **Files:** N/A (local environment configuration)

---

### FIX-002 — Venue Owner Organizations

- **Area:** Venue Owner Dashboard — Organization Setup
- **Description:** Added organization creation as a required step before a venue owner can create their first venue. Added a form for organization name and optional registration number. Owner is now added to `organization_members` on creation. Added self-healing logic for existing organizations with missing membership records. Updated venue empty states to direct owners into organization setup.
- **Files:**
  - `apps/web/src/features/organizations/`
  - `apps/web/app/(venue-owner)/dashboard/venues/new/page.tsx`
  - `apps/web/app/(venue-owner)/dashboard/venues/page.tsx`

---

### FIX-003 — Venue Photo Uploads

- **Area:** Venue Owner Dashboard — Venue Photos
- **Description:** Diagnosed a Storage RLS rejection caused by missing organization membership. Moved photo upload logic through an authenticated server action. Added cleanup handling for cases where file upload succeeds but metadata insertion fails. Added a migration to backfill owner memberships and correct venue-media RLS policies.
- **Files:**
  - `apps/web/src/components/venues/VenuePhotoUpload.tsx`
  - `apps/web/src/features/venues/application/upload-venue-photo.ts`
  - `supabase/migrations/077_org_owner_membership_and_venue_media_rls.sql`

---

### FIX-004 — Venue Map Coordinates

- **Area:** Venue Editor & Admin Venue Review
- **Description:** Fixed the venue editor showing a fallback pin while saving empty coordinates. The form now seeds coordinates from the visible fallback location and shows guidance when the location is only approximate. Admin venue review now normalizes numeric coordinates and displays exact or approximate map location with an appropriate warning.
- **Files:**
  - `apps/web/src/features/venues/ui/VenueLocationPicker.tsx`
  - `apps/web/src/features/venues/application/admin-queries.ts`
  - `apps/web/app/(admin)/admin/venues/[id]/page.tsx`
  - `apps/web/app/(venue-owner)/dashboard/venues/[id]/edit/page.tsx`

---

### FIX-005 — Admin Bookings

- **Area:** Admin Dashboard — Bookings
- **Description:** Replaced the nonexistent `bookings.total_price` field with `total_amount`. Replaced old time fields with `event_date`. Added safe handling for bookings without a finalized amount. Added event date column to the bookings table view. Fixed the same outdated booking columns in dispute details.
- **Files:**
  - `apps/web/app/(admin)/admin/bookings/page.tsx`
  - `apps/web/app/(admin)/admin/disputes/[id]/page.tsx`

---

### FIX-006 — Admin Inquiries

- **Area:** Admin Dashboard — Inquiries
- **Description:** Replaced the nonexistent `supplier_inquiries` table reference with the actual `supplier_contact_requests` table. Updated joins and displayed fields to match the real schema.
- **Files:**
  - `apps/web/app/(admin)/admin/inquiries/page.tsx`

---

### FIX-007 — Admin Disputes

- **Area:** Admin Dashboard — Disputes
- **Description:** Fixed an ambiguous `profiles` relationship by explicitly joining through `raised_by`. Removed an invalid profile email selection. Added safer null handling.
- **Files:**
  - `apps/web/app/(admin)/admin/disputes/page.tsx`
  - `apps/web/app/(admin)/admin/disputes/[id]/page.tsx`

---

### FIX-008 — Supplier Availability Calendar

- **Area:** Supplier Dashboard — Availability Calendar
- **Description:** Redesigned the supplier availability calendar to match the venue-owner calendar, including: same month header and navigation, Today button, status legend, large calendar cells, today highlighting, disabled past dates, modal date editor, and confirmed-job display.
- **Files:**
  - `apps/web/src/features/suppliers/ui/SupplierAvailabilityCalendar.tsx`
  - `apps/web/app/(supplier)/dashboard/supplier/calendar/page.tsx`

---

### FIX-009 — Venue Filters Scrolling

- **Area:** Venues Page — Filter Sidebar
- **Description:** Fixed the desktop filter sidebar being clipped by adding a real viewport-relative height so internal scrolling works correctly. Restored a visible scrollbar. Disabled interaction when the collapsed sidebar is hidden.
- **Files:**
  - `apps/web/src/features/venues/ui/VenuesClient.tsx`
  - `apps/web/src/components/layout/Sidebar.tsx`

---

### FIX-010 — Venue Filter Sidebar Redesign (July 21, 2026)

- **Area:** Venues Page — Filter Sidebar (`/venues`)
- **Status:** Implemented
- **Description:** Redesigned the filter sidebar to reduce long scrolling and simplify controls. Converted the long stacked filter sections into categorized accordion dropdowns; removed budget preset tabs and the capacity slider; removed decorative icons from venue types and amenities; switched Event Type, Venue Type, and Amenities to vertical checkbox lists.
- **Changes:**
  1. **Accordion categories** (one open at a time; Location open by default):
  - Location
  - Event Type
  - Budget & Capacity
  - Venue Type & Indoor/Outdoor
  - Amenities
  2. Closed accordion headers show an **active-count badge** and a short **summary** of selected values.
  3. **Removed** budget tabs: Standard / Deluxe / Luxury — keep **Min** and **Max** ₱ inputs only.
  4. **Removed** capacity range slider — keep **number input** only (“At least X guests” + Reset).
  5. **Removed** venue-type icons — text options only.
  6. **Removed** amenity icons.
  7. **Event Type**, **Venue Type**, and **Amenities** use a shared vertical **checkbox column** UI (`CheckboxColumn`). Event Type remains single-select; Venue Type and Amenities remain multi-select.
  8. Indoor / Outdoor remains three equal chips (Indoor / Outdoor / Both).
  9. Legacy `budget` URL presets are cleared when min/max budget inputs are used.
- **Files:**
  - `apps/web/src/components/layout/Sidebar.tsx`
- **Related QA / product notes:** Addresses long-scroll filter UX called out during design/QA review; complements FIX-009 (sidebar scroll container).

---

### FIX-011 — Supplier Calendar Label “Availability” → “Calendar” (July 21, 2026)

- **Area:** Supplier Dashboard — Calendar Nav / Page Titles
- **Status:** Implemented (resolves BUG-022)
- **Description:** Renamed supplier nav and page titles from “Availability” to “Calendar” so labeling matches the venue-owner calendar pattern and the QA expectation (G8 / BUG-022).
- **Files:**
  - `apps/web/src/components/dashboard/enterprise/nav-config.ts`
  - `apps/web/app/(supplier)/dashboard/supplier/calendar/page.tsx`

---

### FIX-012 — Supplier Filter Sidebar Redesign (July 21, 2026)

- **Area:** Suppliers Page — Filter Sidebar (`/suppliers`)
- **Status:** Implemented
- **Description:** Matched the venues filter accordion design on the supplier marketplace. Converted stacked filter sections into categorized accordions; Category and Rating use vertical checkbox columns; Budget uses Min + Max inputs.
- **Accordion categories:**
  - Search
  - Location
  - Category (checkbox column, single-select)
  - Budget & Rating (Min/Max ₱ + rating checkboxes)
- **Files:**
  - `apps/web/src/features/suppliers/ui/SuppliersMarketplaceClient.tsx`

---

## Change Log — July 21, 2026 (This Session)

| Item          | Type             | Summary                                                                         |
| ------------- | ---------------- | ------------------------------------------------------------------------------- |
| FIX-010       | Enhancement / UX | Venue filter accordion redesign + checkbox columns                              |
| FIX-011       | Copy / UX        | Supplier Calendar label fix (BUG-022)                                           |
| FIX-012       | Enhancement / UX | Supplier filter accordion redesign (match venues)                               |
| Env / tooling | Local setup      | Node/`pnpm` PATH setup notes from local machine (not committed as product code) |
| Docs          | QA               | Manual pass report + this bug report checked into `docs/testing/`               |

---

## Verification Notes

- Edited files showed no IDE lint errors for the filter sidebar changes.
- Full lint/type-check/test suite has not yet been run for FIX-010 / FIX-011.
- Supabase migration `077` still needs to be applied to each hosted environment.
- **Retest recommended:** `/venues` filter accordion open/close, Min/Max budget, capacity number input, Event/Venue/Amenities checkboxes, Clear + View Results; supplier nav shows **Calendar**.

---

### BUG-017 — Forgot Password Flow Fails

- **Severity:** Critical
- **Area:** Authentication — Forgot Password (`/forgot-password`)
- **Description:** The forgot password flow fails. Needs investigation into email send behavior, confirmation UI messaging, and account-enumeration safety.
- **Investigation Checklist:**
  - Does the UI show a success message without leaking account existence when an email is submitted?
  - Does Supabase Auth actually send the recovery email in this environment?
  - Does the email link land on `/reset-password` with a valid recovery session?
- **Expected Result:** Submitting an email on `/forgot-password` should reliably trigger a recovery email and show a neutral success message regardless of whether the account exists.
- **Actual Result:** Flow fails; root cause not yet confirmed.

---

### BUG-018 — Reset Password Flow Fails

- **Severity:** Critical
- **Area:** Authentication — Reset Password (`/reset-password`)
- **Description:** The reset password flow fails, likely as a downstream effect of BUG-017 (forgot password) or an issue with recovery session/token handling.
- **Investigation Checklist:**
  - Can a new password be set using the recovery link/session?
  - Does the new password work to log in afterward?
  - Is expired/invalid token error handling in place?
- **Expected Result:** User should be able to set a new password via the reset link and log in successfully with it.
- **Actual Result:** Flow fails; likely blocked by recovery session/token handling.
- **Note:** Recommend retesting C4 (forgot password) and C5 (reset password) together as a single recovery path: forgot email → link → reset → login.

---

### BUG-019 — Natural Language Venue Search Fails

- **Severity:** High
- **Area:** AI Features — NL Venue Search (Landing / Marketplace)
- **Description:** The natural-language venue search feature is broken or not returning ranked results.
- **Investigation Checklist:**
  - Does the request to the AI search edge function/API succeed (check Network tab)?
  - Do ranked venue results render, rather than an empty state, error toast, or fallback-only results?
  - Check AI keys, feature flags in `/admin/ai-configuration`, and Supabase edge function deployment status.
- **Expected Result:** Entering a natural-language query should return ranked, relevant venue results.
- **Actual Result:** Search fails or does not return ranked results.

---

### BUG-020 — Wrong-Role Denial Shows /login Instead of /unauthorized

- **Severity:** Medium
- **Area:** Auth / Routing — Role-Based Access Control
- **Description:** When an authenticated user with the wrong role (e.g., venue owner) visits a restricted page (e.g., admin routes), the app redirects to `/login` instead of `/unauthorized`. Additionally, the user is not routed back to their own dashboard after denial.
- **Expected Result:**
  - Authenticated wrong-role user → `/unauthorized`.
  - Unauthenticated user → `/login` (with optional `redirectTo`).
  - After denial, an authenticated venue owner should be able to navigate back to `/dashboard` without a forced re-login.
- **Actual Result:** Authenticated wrong-role users are redirected to `/login`, and there's no clear path back to their dashboard.
- **Suggested Retest:** While logged in as venue owner, visit `/admin`, `/dashboard/supplier`, and `/admin/users`; confirm the path is `/unauthorized`, and verify recovery/home/dashboard links from the unauthorized page lead back to the venue dashboard.

---

### BUG-021 — Overlapped Text on Booking Message Card

- **Severity:** Low
- **Area:** Venue Owner Dashboard — Booking Message Thread
- **Description:** The booking message thread functions correctly, but text on the message card visually overlaps.
- **Expected Result:** Card text should be fully readable with no overlap.
- **Actual Result:** Text overlap present on the card.

---

### BUG-022 — Supplier Calendar Label Says "Availability" Instead of "Calendar"

- **Severity:** Low
- **Area:** Supplier Dashboard — Calendar Navigation/Title
- **Status:** Fixed (FIX-011 — July 21, 2026)
- **Description:** The supplier calendar nav item and page title read "Availability" but should read "Calendar."
- **Expected Result:** Label should say "Calendar."
- **Actual Result (pre-fix):** Label said "Availability."
- **Resolution:** Nav label and page titles updated to "Calendar." See FIX-011.

---

## Open / Still Checking (from July 20 Manual QA Pass)

The following items were not yet conclusively verified as of the July 20, 2026 manual QA pass and require follow-up testing before they can be marked pass or fail:

| ID   | Area          | Notes                                                                                                           |
| ---- | ------------- | --------------------------------------------------------------------------------------------------------------- |
| A7   | Cross-cutting | Responsive layout still checking                                                                                |
| E11  | Venue Owner   | Staff invite/manage still checking                                                                              |
| E12  | Venue Owner   | `/staff/accept?token=…` invitation flow still checking                                                          |
| E18  | Venue Owner   | Supplier dashboard denial still checking                                                                        |
| H2.1 | Admin         | Finance admin allow/deny matrix still checking                                                                  |
| H3.1 | Admin         | Analyst admin allow/deny matrix still checking                                                                  |
| H4.1 | Admin         | Support admin permission matrix still checking                                                                  |
| D6.4 | Customer      | Admin report export (`/api/admin/reports/export`) denial for non-admin roles needs Network-tab proof of 401/403 |

---

## Notes

- Severity ratings are initial QA assessments and can be adjusted during triage with the dev team.
- BUG-009 is flagged as Critical since it blocks proposal submissions entirely — recommend prioritizing this first.
- Several nav-related issues (BUG-003, BUG-007, BUG-011, BUG-012) may share a root cause in how the navigation state/config is structured and could potentially be addressed together.
- **July 20, 2026 Manual QA Pass:** Full user-facing functionality checklist (162 items, sections A–M) resulted in 148 Pass, 4 Fail, 8 Checking (open), 2 Elaborate/note. Failures and relevant notes from this pass are logged as BUG-017 through BUG-022 above; open items are listed in the "Open / Still Checking" section. The full raw checklist results are included below for reference.
- **July 21, 2026:** FIX-010 (venue filter accordion redesign) and FIX-011 (supplier Calendar label / BUG-022) implemented. See Fixes Implemented and Change Log sections.

---

# Manual QA Pass Report

**Date:** July 20, 2026
**Scope:** Full user-facing functionality checklist (sections A–M)
**App:** apps/web
**Tester notes:** Manual browser QA against local/dev environment

## Summary

| Status           | Count   |
| ---------------- | ------- |
| Pass             | 148     |
| Fail             | 4       |
| Checking (open)  | 8       |
| Elaborate / note | 2       |
| **Total items**  | **162** |

## Failures (must fix or retest)

| ID  | Area           | Issue                                                                            |
| --- | -------------- | -------------------------------------------------------------------------------- |
| C4  | Auth           | Forgot password flow failed                                                      |
| C5  | Auth           | Reset password flow failed                                                       |
| K1  | AI             | NL venue search failed                                                           |
| E17 | Venue security | Unauthorized page should show `/unauthorized`, but redirects to `/login` instead |

## Open / Still Checking

| ID   | Area          | Notes                                          |
| ---- | ------------- | ---------------------------------------------- |
| A7   | Cross-cutting | Responsive layout still checking               |
| E11  | Venue owner   | Staff invite/manage still checking             |
| E12  | Venue owner   | `/staff/accept` invitation flow still checking |
| E18  | Venue owner   | Supplier dashboard denial still checking       |
| H2.1 | Admin         | Finance admin allow/deny matrix still checking |
| H3.1 | Admin         | Analyst admin allow/deny matrix still checking |
| H4.1 | Admin         | Support admin permission matrix still checking |

## Pass-with-Notes (UX / Product)

| ID  | Area        | Notes                                                                                                       |
| --- | ----------- | ----------------------------------------------------------------------------------------------------------- |
| E7  | Venue owner | Booking messages pass, but overlapped text on card                                                          |
| G8  | Supplier    | Calendar works; label updated to "Calendar" (FIX-011)                                                       |
| E17 | Venue owner | Denial works, but lands on `/login` instead of `/unauthorized` (and does not route back to venue dashboard) |

## Status Legend

| Mark     | Meaning                        |
| -------- | ------------------------------ |
| Pass     | Behavior matches expected      |
| Fail     | Behavior broken or incorrect   |
| Checking | Not finished / inconclusive    |
| N/A      | Out of scope for this run      |
| Note     | Pass or Fail with extra detail |

---

## A. Global / Cross-Cutting

| ID  | Functionality                            | Status   | Notes                                 |
| --- | ---------------------------------------- | -------- | ------------------------------------- |
| A1  | Route protection (logged-out → /login)   | Pass     |                                       |
| A2  | Wrong role → /unauthorized               | Pass     | See E17 conflict for venue-owner case |
| A3  | Post-login role redirect                 | Pass     |                                       |
| A4  | Logout clears session                    | Pass     |                                       |
| A5  | Redirect aliases                         | Pass     |                                       |
| A6  | Cross-tenant isolation                   | Pass     |                                       |
| A7  | Responsive layout                        | Checking |                                       |
| A8  | Accessibility smoke (/, /venues, /login) | Pass     |                                       |
| A9  | /429 rate-limit page                     | Pass     |                                       |

## B. Public / Marketing (No Login)

| ID  | Route / Action                       | Status | Notes |
| --- | ------------------------------------ | ------ | ----- |
| B1  | / landing + hero search              | Pass   |       |
| B2  | /venues browse / filter / pagination | Pass   |       |
| B3  | /venues/[slug] detail                | Pass   |       |
| B4  | /venues/[slug]/book requires login   | Pass   |       |
| B5  | /suppliers browse + filters          | Pass   |       |
| B6  | /suppliers/[slug] detail             | Pass   |       |
| B7  | Favorite (anon) → login prompt       | Pass   |       |
| B8  | /features                            | Pass   |       |
| B9  | /pricing                             | Pass   |       |
| B10 | /about                               | Pass   |       |
| B11 | /careers                             | Pass   |       |
| B12 | /newsroom                            | Pass   |       |
| B13 | /hosting-resources                   | Pass   |       |
| B14 | /host-protection                     | Pass   |       |
| B15 | /safety                              | Pass   |       |
| B16 | /cancellation-options                | Pass   |       |
| B17 | /privacy                             | Pass   |       |
| B18 | /terms                               | Pass   |       |
| B19 | /help                                | Pass   |       |

## C. Authentication

| ID  | Flow                                     | Status | Notes                                                                    |
| --- | ---------------------------------------- | ------ | ------------------------------------------------------------------------ |
| C1  | Register                                 | Pass   |                                                                          |
| C2  | Email verification                       | Pass   |                                                                          |
| C3  | Login                                    | Pass   |                                                                          |
| C4  | Forgot password (/forgot-password)       | Fail   | Needs investigation (email send, confirmation UI, enumeration messaging) |
| C5  | Reset password (/reset-password)         | Fail   | Likely blocked by C4 or recovery session/token handling                  |
| C6  | Logout                                   | Pass   |                                                                          |
| C7  | Deep-link protection + return            | Pass   |                                                                          |
| C8  | Suspended account blocked                | Pass   |                                                                          |
| C9  | Pending partner application restrictions | Pass   |                                                                          |

**C4 / C5 investigation checklist:**

- Submit email on `/forgot-password` — does UI show success without leaking account existence?
- Does Supabase Auth send the recovery email in this environment?
- Does the email link land on `/reset-password` with a valid recovery session?
- Can a new password be set and used to log in?
- Expired/invalid token error handling

## D. Customer

### D1. Profile & Account

| ID   | Route / Action                    | Status | Notes                |
| ---- | --------------------------------- | ------ | -------------------- |
| D1.1 | /profile/setup                    | Pass   |                      |
| D1.2 | /account                          | Pass   |                      |
| D1.3 | /account/dashboard                | Pass   |                      |
| D1.4 | /account/personal-details         | Pass   |                      |
| D1.5 | /account/change-password          | Pass   |                      |
| D1.6 | /account/privacy (Coming soon UI) | Pass   | Placeholder expected |
| D1.7 | /settings notification prefs      | Pass   |                      |
| D1.8 | /account/become-partner           | Pass   |                      |
| D1.9 | Delete account                    | Pass   |                      |

### D2. Marketplace (Logged In)

| ID   | Action                    | Status | Notes |
| ---- | ------------------------- | ------ | ----- |
| D2.1 | Favorite venue add/remove | Pass   |       |
| D2.2 | /favorites list           | Pass   |       |
| D2.3 | Favorite supplier         | Pass   |       |
| D2.4 | Supplier inquiry submit   | Pass   |       |

### D3. Booking Lifecycle

| ID   | Route / Action           | Status | Notes |
| ---- | ------------------------ | ------ | ----- |
| D3.1 | Booking inquiry submit   | Pass   |       |
| D3.2 | /bookings list + filters | Pass   |       |
| D3.3 | /bookings/[id] detail    | Pass   |       |
| D3.4 | Venue approve → approved | Pass   |       |
| D3.5 | Start PayMongo checkout  | Pass   |       |
| D3.6 | Webhook → confirmed      | Pass   |       |
| D3.7 | Confirmation page        | Pass   |       |
| D3.8 | Cancel booking           | Pass   |       |
| D3.9 | Submit review + photos   | Pass   |       |

### D4. Payments & Inquiries

| ID   | Route                  | Status | Notes |
| ---- | ---------------------- | ------ | ----- |
| D4.1 | /account/payments      | Pass   |       |
| D4.2 | /account/transactions  | Pass   |       |
| D4.3 | /inquiries/[id] quotes | Pass   |       |

### D5. Notifications

| ID   | Action                     | Status | Notes |
| ---- | -------------------------- | ------ | ----- |
| D5.1 | Notification bell          | Pass   |       |
| D5.2 | Mark read on click         | Pass   |       |
| D5.3 | /notifications inbox       | Pass   |       |
| D5.4 | Push subscribe/unsubscribe | Pass   |       |

### D6. Customer Negative Tests

| ID   | Action                       | Status    | Notes     |
| ---- | ---------------------------- | --------- | --------- |
| D6.1 | Visit /admin/*               | Pass      | Denied    |
| D6.2 | Visit /dashboard/venue-owner | Pass      | Denied    |
| D6.3 | Visit /dashboard/supplier    | Pass      | Denied    |
| D6.4 | Admin API export denial      | Elaborate | See below |

**D6.4 — Elaborate: Admin Report Export Denial**

_What to test:_ As a customer (or any non-admin role), call the admin report export endpoint: `GET /api/admin/reports/export` (optionally with query params used by the admin reports UI).

_Expected:_

| Check        | Expected Result                                                                              |
| ------------ | -------------------------------------------------------------------------------------------- |
| HTTP status  | 401 (unauthenticated) or 403 (authenticated but missing `reports.export` / admin permission) |
| Body         | Error payload only — no CSV/report data                                                      |
| Side effects | No file download; no audit "export success" for this user                                    |
| UI           | Customer has no nav link to admin reports/export                                             |

_How to verify quickly:_

1. Log in as customer.
2. Open browser DevTools → Network.
3. Visit or `fetch('/api/admin/reports/export')` from the console while on the app origin.
4. Confirm status is 401/403, not 200 with CSV.
5. Optionally repeat as venue owner / supplier — same denial.

_Pass criteria:_ Non-admin never receives export content.
_Fail criteria:_ 200 + downloadable report, or silent data leak.

## E. Venue Owner

| ID  | Route / Action                   | Status     | Notes                                                                     |
| --- | -------------------------------- | ---------- | ------------------------------------------------------------------------- |
| E1  | /dashboard overview              | Pass       |                                                                           |
| E2  | /dashboard/venues list           | Pass       |                                                                           |
| E3  | Create venue                     | Pass       |                                                                           |
| E4  | Edit/delete venue                | Pass       |                                                                           |
| E5  | /dashboard/bookings              | Pass       |                                                                           |
| E6  | Approve / decline booking        | Pass       |                                                                           |
| E7  | Booking message thread           | Pass       | UX: overlapped text on card                                               |
| E8  | Mark booking complete            | Pass       |                                                                           |
| E9  | /dashboard/calendar availability | Pass       |                                                                           |
| E10 | /dashboard/packages              | Pass       |                                                                           |
| E11 | /dashboard/staff invite/manage   | Checking   |                                                                           |
| E12 | /staff/accept?token=…            | Checking   |                                                                           |
| E13 | /dashboard/reviews + reply       | Pass       |                                                                           |
| E14 | Analytics + export               | Pass       |                                                                           |
| E15 | AI venue description             | Pass       |                                                                           |
| E16 | AI package comparison            | Pass       |                                                                           |
| E17 | Deny /admin/*                    | Pass (bug) | Shows /login instead of /unauthorized; does not return to venue dashboard |
| E18 | Deny /dashboard/supplier         | Checking   |                                                                           |
| E19 | Cross-tenant booking isolation   | Pass       |                                                                           |

**E17 — Unauthorized routing bug (detail)**

_Observed:_

- Venue owner visits an unauthorized page (e.g. admin).
- App redirects to `/login` rather than `/unauthorized`.
- After denial, user is not routed back to the venue owner dashboard.

_Expected (per checklist A2 / E17):_

- Authenticated wrong-role user → `/unauthorized`.
- Unauthenticated user → `/login` (with optional `redirectTo`).
- Authenticated venue owner after denial should remain able to navigate back to `/dashboard` without a forced re-login UX.

_Suggested retest:_

1. Stay logged in as venue owner.
2. Hit `/admin`, `/dashboard/supplier`, `/admin/users`.
3. Confirm path is `/unauthorized` (not `/login`).
4. Use recovery/home/dashboard links from unauthorized page → land on venue dashboard.

## F. Event Coordinator

| ID  | Route                  | Status | Notes |
| --- | ---------------------- | ------ | ----- |
| F1  | /dashboard/coordinator | Pass   |       |
| F2  | Events list            | Pass   |       |
| F3  | Event detail           | Pass   |       |
| F4  | Coordinator calendar   | Pass   |       |
| F5  | Venues discovery       | Pass   |       |
| F6  | Suppliers discovery    | Pass   |       |
| F7  | Reports                | Pass   |       |
| F8  | Shared venue tools     | Pass   |       |

## G. Supplier

| ID  | Route / Action                | Status | Notes                               |
| --- | ----------------------------- | ------ | ----------------------------------- |
| G1  | Supplier overview             | Pass   |                                     |
| G2  | Business profile              | Pass   |                                     |
| G3  | Services CRUD                 | Pass   |                                     |
| G4  | Inquiries list                | Pass   |                                     |
| G5  | Inquiry detail + messages     | Pass   |                                     |
| G6  | Quotes list                   | Pass   |                                     |
| G7  | Quote draft / send / withdraw | Pass   |                                     |
| G8  | Supplier calendar             | Pass   | Label fixed to "Calendar" (FIX-011) |
| G9  | Portfolio list                | Pass   |                                     |
| G10 | Portfolio create              | Pass   |                                     |
| G11 | Portfolio edit                | Pass   |                                     |
| G12 | Reviews                       | Pass   |                                     |
| G13 | Bookings / jobs               | Pass   |                                     |
| G14 | Analytics                     | Pass   |                                     |
| G15 | Deny /admin/*                 | Pass   |                                     |
| G16 | Deny /dashboard/venue-owner   | Pass   |                                     |

**G8 — Copy fix**

| Location                           | Previous       | Expected / Current           |
| ---------------------------------- | -------------- | ---------------------------- |
| Supplier calendar nav / page title | "Availability" | "Calendar" (fixed — FIX-011) |

## H. Admin

### H1. Super Admin

| ID    | Route / Action                      | Status | Notes                                   |
| ----- | ----------------------------------- | ------ | --------------------------------------- |
| H1.1  | /admin overview                     | Pass   |                                         |
| H1.2  | Partner applications                | Pass   |                                         |
| H1.3  | Users list                          | Pass   |                                         |
| H1.4  | Suspend / reactivate user           | Pass   |                                         |
| H1.5  | Venues review list                  | Pass   |                                         |
| H1.6  | Approve / reject / suspend venue    | Pass   |                                         |
| H1.7  | Suppliers list                      | Pass   |                                         |
| H1.8  | Approve / reject / suspend supplier | Pass   |                                         |
| H1.9  | Platform bookings                   | Pass   |                                         |
| H1.10 | Inquiries monitor                   | Pass   |                                         |
| H1.11 | Review moderation                   | Pass   |                                         |
| H1.12 | Marketplace flags                   | Pass   |                                         |
| H1.13 | Reports                             | Pass   |                                         |
| H1.14 | Reports export                      | Pass   |                                         |
| H1.15 | Disputes                            | Pass   | Workflow may still be partial by design |
| H1.16 | Commissions                         | Pass   |                                         |
| H1.17 | AI configuration (no secrets)       | Pass   |                                         |
| H1.18 | System settings                     | Pass   |                                         |
| H1.19 | Administrators                      | Pass   |                                         |
| H1.20 | Audit logs                          | Pass   |                                         |
| H1.21 | Self-demotion guard                 | Pass   |                                         |

### H2–H4. Tier Matrices (Open)

| ID   | Tier                      | Status   | Notes                                                                                                                                 |
| ---- | ------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| H2.1 | Finance admin allow/deny  | Checking | Can: Overview, Commissions, Reports, Audit. Cannot: Users, Venues, Suppliers, Applications, Marketplace, AI, Settings, Administrators |
| H3.1 | Analyst admin allow/deny  | Checking | Can: Overview, Reports, Audit. Cannot: Commissions + management modules                                                               |
| H4.1 | Support admin permissions | Checking | Verify against permissions.ts / nav gating                                                                                            |

## I. Payments (PayMongo)

| ID  | Action                           | Status | Notes                                                                                |
| --- | -------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| I1  | Start checkout → payment_pending | Pass   |                                                                                      |
| I2  | Success return URL               | Pass   |                                                                                      |
| I3  | Webhook → confirmed              | Pass   |                                                                                      |
| I4  | Refund request                   | Pass   |                                                                                      |
| I5  | Receipt / invoice visibility     | Pass   |                                                                                      |
| I6  | Maya webhook                     | Pass   | Marked pass in this run; still treat as non-prod-ready per product docs if retesting |

## J. Notifications

| ID  | Channel / Action     | Status | Notes |
| --- | -------------------- | ------ | ----- |
| J1  | In-app bell + inbox  | Pass   |       |
| J2  | Mark read / mark all | Pass   |       |
| J3  | Email triggers       | Pass   |       |
| J4  | Web push             | Pass   |       |
| J5  | Preferences persist  | Pass   |       |

## K. AI Features

| ID  | Feature                      | Status | Notes                                                                              |
| --- | ---------------------------- | ------ | ---------------------------------------------------------------------------------- |
| K1  | NL venue search              | Fail   | Landing/marketplace natural-language search broken or not returning ranked results |
| K2  | Venue recommendations        | Pass   |                                                                                    |
| K3  | Cost estimator               | Pass   |                                                                                    |
| K4  | Package comparison           | Pass   |                                                                                    |
| K5  | Venue description generation | Pass   |                                                                                    |
| K6  | Customer assistant           | Pass   |                                                                                    |
| K7  | Admin AI config              | Pass   |                                                                                    |

**K1 investigation checklist:**

1. Enter a natural-language query on landing / search.
2. Confirm request to AI search edge function / API succeeds (Network tab).
3. Confirm ranked venue results render (not empty / error toast / fallback-only).
4. Check env: AI keys, feature flags in `/admin/ai-configuration`, Supabase edge function deploy.

## L. File Uploads

| ID  | Bucket / Use Case | Status | Notes |
| --- | ----------------- | ------ | ----- |
| L1  | Avatars           | Pass   |       |
| L2  | Venue images      | Pass   |       |
| L3  | Verification docs | Pass   |       |
| L4  | Review photos     | Pass   |       |

## M. Booking State Machine Branches

| ID  | Branch                       | Status | Notes |
| --- | ---------------------------- | ------ | ----- |
| M1  | Venue declines → declined    | Pass   |       |
| M2  | Customer cancels → cancelled | Pass   |       |
| M3  | Booking expires → expired    | Pass   |       |

## Defect Backlog (From This Pass)

| Priority | ID                                  | Title                                                   | Type                           |
| -------- | ----------------------------------- | ------------------------------------------------------- | ------------------------------ |
| P0       | C4                                  | Forgot password flow fails                              | Functional                     |
| P0       | C5                                  | Reset password flow fails                               | Functional                     |
| P1       | K1                                  | NL venue search fails                                   | Functional / AI                |
| P1       | E17                                 | Wrong-role denial shows /login instead of /unauthorized | Auth / routing                 |
| P2       | E7                                  | Overlapped text on venue booking message card           | UI                             |
| P2       | G8 / BUG-022                        | Supplier nav/title "Availability" → "Calendar"          | Copy — **Fixed (FIX-011)**     |
| —        | Filter UX                           | Long filter sidebar / accordion redesign                | UX — **Implemented (FIX-010)** |
| —        | A7, E11, E12, E18, H2.1, H3.1, H4.1 | Still checking                                          | Open                           |

## Recommended Next Actions

1. Retest C4 → C5 as one recovery path (forgot email → link → reset → login).
2. Fix / retest E17 unauthorized routing for authenticated wrong-role users.
3. Debug K1 NL search (network + AI config + edge function).
4. Finish open items: A7, E11, E12, E18, H2–H4.
5. File / fix P2 UX ticket for E7 overlapped text on booking message card.
6. Complete D6.4 with Network-tab proof of 401/403 on `/api/admin/reports/export`.
7. **Retest FIX-010** on `/venues` (accordion filters, Min/Max budget, capacity input, checkbox lists).
8. **Confirm FIX-011** supplier nav/page titles show "Calendar".

## Appendix — Full Result Dump (Raw)

```
A1-A6 Pass | A7 Checking | A8-A9 Pass
B1-B19 Pass
C1-C3 Pass | C4 Fail | C5 Fail | C6-C9 Pass
D1.* Pass | D2.* Pass | D3.* Pass | D4.* Pass | D5.* Pass
D6.1-D6.3 Pass | D6.4 Elaborate
E1-E10 Pass | E7 note: overlapped text | E11-E12 Checking
E13-E16 Pass | E17 Pass but login not unauthorized | E18 Checking | E19 Pass
F1-F8 Pass
G1-G16 Pass | G8 fixed: Calendar label (FIX-011)
H1.* Pass | H2.1/H3.1/H4.1 Checking
I1-I6 Pass
J1-J5 Pass
K1 Fail | K2-K7 Pass
L1-L4 Pass
M1-M3 Pass
```

_Generated from the July 20, 2026 manual QA checklist results._
