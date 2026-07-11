# Supplier Dashboard Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Venora's supplier dashboard with secure quotes, inquiry messaging, availability, review visibility, real overview/analytics data, and responsive supplier-focused navigation.

**Architecture:** Preserve current supplier profile, service, portfolio, inquiry, job, analytics, auth, and dashboard-shell code. Add one RLS-protected migration for missing supplier domains, implement server-owned mutations in the supplier feature, and compose route pages from focused client managers and existing enterprise dashboard UI.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase/Postgres RLS, Zod, Vitest, Tailwind CSS, date-fns, existing Venora calendar/dashboard components.

## Global Constraints

- Do not install packages or modify `package.json` or `pnpm-lock.yaml`.
- Preserve existing authentication, RBAC, middleware, customer booking, venue owner, coordinator, admin, and payment behavior.
- Use existing database status values where a table already exists.
- Derive supplier ownership from the authenticated user in every server mutation.
- Do not use service-role credentials in client components or weaken RLS.
- Keep `/dashboard/supplier/bookings` as the canonical route while labeling it `Jobs`.
- Block customer inquiry submission for manually unavailable/blocked dates and confirmed supplier-job dates.

---

### Task 1: Supplier Domain Migration and Contracts

**Files:**
- Create: `supabase/migrations/053_supplier_dashboard_domains.sql`
- Create: `apps/web/src/features/suppliers/types/supplier-dashboard.types.ts`
- Create: `apps/web/src/features/suppliers/schemas/supplier-dashboard.schema.ts`
- Test: `apps/web/src/features/suppliers/schemas/supplier-dashboard.schema.test.ts`

**Interfaces:**
- Produces: `SupplierQuoteStatus`, `SupplierAvailabilityStatus`, `SupplierQuote`, `SupplierQuoteItem`, `SupplierInquiryMessage`, `SupplierAvailabilityEntry`
- Produces: `supplierQuoteSchema`, `supplierMessageSchema`, `supplierAvailabilitySchema`, `supplierInquiryQuerySchema`

- [ ] **Step 1: Write failing schema tests**

Cover positive quote totals, non-empty line items, valid ISO dates, allowed availability states, trimmed messages, and rejected unsupported states.

```ts
expect(() => supplierQuoteSchema.parse(validQuote)).not.toThrow();
expect(() => supplierQuoteSchema.parse({ ...validQuote, items: [] })).toThrow();
expect(() => supplierAvailabilitySchema.parse({ date: "2026-12-01", status: "booked" })).toThrow();
expect(() => supplierMessageSchema.parse({ inquiryId, message: "   " })).toThrow();
```

- [ ] **Step 2: Run the schema tests and confirm failure**

Run: `pnpm --filter @venora/web test -- src/features/suppliers/schemas/supplier-dashboard.schema.test.ts`

Expected: FAIL because the dashboard schemas do not exist.

- [ ] **Step 3: Add focused TypeScript contracts and Zod schemas**

Use manual availability states `available | unavailable | blocked` and quote states `draft | sent | accepted | declined | expired | withdrawn`. Require at least one quote item; calculate line totals server-side rather than trusting submitted totals.

- [ ] **Step 4: Add the database migration**

Create `supplier_quotes`, `supplier_quote_items`, `supplier_inquiry_messages`, and `supplier_availability` with foreign keys, checks, timestamps, indexes, and RLS. Add helper predicates that verify supplier ownership and inquiry participation. Add policies for supplier-owned quote/availability writes and participant-only quote/message reads. Preserve `is_admin()` access using existing policy style.

- [ ] **Step 5: Re-run schema tests**

Expected: PASS.

---

### Task 2: Secure Supplier Dashboard Server Operations

**Files:**
- Create: `apps/web/src/features/suppliers/application/dashboard-actions.ts`
- Create: `apps/web/src/features/suppliers/application/dashboard-queries.ts`
- Test: `apps/web/src/features/suppliers/application/dashboard-actions.test.ts`
- Modify: `apps/web/src/features/suppliers/application/actions.ts`

**Interfaces:**
- Produces: `getOwnedSupplierInquiry`, `listSupplierQuotes`, `getSupplierCalendarMonth`, `getSupplierReviews`
- Produces: `upsertSupplierQuoteAction`, `sendSupplierQuoteAction`, `withdrawSupplierQuoteAction`, `sendSupplierInquiryMessageAction`, `setSupplierAvailabilityAction`, `clearSupplierAvailabilityAction`
- Consumes: schemas and types from Task 1

- [ ] **Step 1: Write failing ownership and transition tests**

Test that the authenticated supplier is derived from `supplier_profiles.profile_id`, inquiry ownership is checked before quote/message writes, only drafts are editable/sendable, only sent quotes are withdrawable, and availability ignores client-provided supplier IDs.

```ts
expect(await upsertSupplierQuoteAction(foreignInquiry)).toMatchObject({ error: { code: "FORBIDDEN" } });
expect(await sendSupplierQuoteAction({ quoteId: acceptedQuoteId })).toHaveProperty("error");
expect(availabilityInsert).toMatchObject({ supplier_id: ownedSupplierId });
```

- [ ] **Step 2: Run action tests and confirm failure**

Run: `pnpm --filter @venora/web test -- src/features/suppliers/application/dashboard-actions.test.ts`

Expected: FAIL because the actions do not exist.

- [ ] **Step 3: Implement ownership helpers and read queries**

Centralize authenticated supplier lookup and owned-inquiry lookup. Return not-found behavior for foreign private rows. Query quotes, messages, availability, confirmed jobs, and published supplier reviews through the authenticated supplier ID.

- [ ] **Step 4: Implement quote, message, and availability actions**

Calculate quote subtotal and total from parsed line items, replace draft items transactionally through ordered deletes/inserts, enforce state transitions on the update filter, and revalidate affected supplier/customer paths. Message inserts set `sender_id` from the session. Availability upserts use `(supplier_id,date)` and refuse confirmed-job dates.

- [ ] **Step 5: Add customer inquiry availability validation**

In `createSupplierContactRequestAction`, after resolving the authoritative event date, query `supplier_availability` and confirmed `booking_suppliers` for that supplier/date. Throw `ValidationError("This supplier is unavailable on the selected date. Please choose another date.")` before insertion.

- [ ] **Step 6: Run action tests**

Expected: PASS.

---

### Task 3: Inquiry List, Detail, and Conversation

**Files:**
- Modify: `apps/web/app/(supplier)/dashboard/supplier/inquiries/page.tsx`
- Create: `apps/web/app/(supplier)/dashboard/supplier/inquiries/[id]/page.tsx`
- Create: `apps/web/app/(supplier)/dashboard/supplier/_components/inquiry-message-thread.tsx`
- Create: `apps/web/app/(supplier)/dashboard/supplier/_components/inquiry-filters.tsx`

**Interfaces:**
- Consumes: `getOwnedSupplierInquiry`, inquiry message query, and `sendSupplierInquiryMessageAction`
- Produces: detail links used by quote creation

- [ ] **Step 1: Add list query parsing and detail links**

Use URL search params `q`, `status`, and `sort`. Filter only the authenticated supplier's direct inquiries and keep existing enum values `new`, `responded`, and `closed` while rendering friendly badges.

- [ ] **Step 2: Build the protected detail route**

Render customer contact, requested service, approved booking snapshots, venue/location, event date/time, guest count, original request, status, message thread, and quote panel. Return `notFound()` for foreign inquiries.

- [ ] **Step 3: Add the text-only conversation form**

Submit trimmed messages through the server action, show pending/error state, reset after success, and refresh the route. Do not add attachments, typing indicators, presence, or a new realtime channel.

- [ ] **Step 4: Verify inquiry pages**

Run the supplier action tests and type-check the web app.

---

### Task 4: Quote Management UI

**Files:**
- Create: `apps/web/app/(supplier)/dashboard/supplier/quotes/page.tsx`
- Create: `apps/web/app/(supplier)/dashboard/supplier/quotes/[id]/page.tsx`
- Create: `apps/web/app/(supplier)/dashboard/supplier/_components/quote-editor.tsx`
- Create: `apps/web/app/(supplier)/dashboard/supplier/_components/quote-actions.tsx`

**Interfaces:**
- Consumes: quote query/actions from Task 2
- Produces: quote list/detail routes linked from inquiry details

- [ ] **Step 1: Build the real-data quote list**

Show title, customer, event date, total, valid-until date, status, and actions. Filter by existing quote status and render a first-quote empty state linked to inquiries.

- [ ] **Step 2: Build the quote editor**

Support title, description, dynamic line items, additional fees, valid-until date, and terms. Display client-side computed totals for feedback while the server remains authoritative. Only drafts render editable controls.

- [ ] **Step 3: Add send and withdraw controls**

Require confirmation, expose server errors, and prevent actions while pending. Finalized quotes remain read-only. Do not expose an accept/decline supplier control.

- [ ] **Step 4: Verify quote routes**

Run quote/action tests and web type-check.

---

### Task 5: Supplier Availability and Customer Blocking

**Files:**
- Create: `apps/web/app/(supplier)/dashboard/supplier/calendar/page.tsx`
- Create: `apps/web/src/features/suppliers/ui/SupplierAvailabilityCalendar.tsx`
- Create: `apps/web/src/features/suppliers/ui/SupplierAvailabilityEditor.tsx`
- Modify: `apps/web/src/features/suppliers/ui/SupplierContactForm.tsx`
- Test: `apps/web/src/features/suppliers/application/actions.test.ts`

**Interfaces:**
- Consumes: calendar month query and availability actions from Task 2
- Produces: disabled dates for the public inquiry form

- [ ] **Step 1: Add failing inquiry-blocking tests**

Cover manually blocked, manually unavailable, confirmed-job, and available dates. Confirm blocked dates never reach the inquiry insert.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `pnpm --filter @venora/web test -- src/features/suppliers/application/actions.test.ts`

- [ ] **Step 3: Build the supplier calendar page**

Reuse existing date-fns and Venora calendar presentation patterns. Merge manual entries with confirmed jobs, show a legend, select a date, edit manual state/reason, clear overrides, and prevent changes to booked dates.

- [ ] **Step 4: Add public form feedback**

Provide known unavailable dates to `SupplierContactForm`, set native date constraints where possible, and show the approved unavailable-date message. Keep the server check authoritative for stale or manipulated clients.

- [ ] **Step 5: Re-run inquiry tests**

Expected: PASS.

---

### Task 6: Reviews, Jobs, and Supplier Navigation

**Files:**
- Create: `apps/web/app/(supplier)/dashboard/supplier/reviews/page.tsx`
- Modify: `apps/web/app/(supplier)/dashboard/supplier/bookings/page.tsx`
- Modify: `apps/web/src/components/dashboard/enterprise/nav-config.ts`
- Modify: `apps/web/src/components/dashboard/enterprise/EnterpriseShell.tsx`

**Interfaces:**
- Consumes: published supplier review query from Task 2
- Produces: final supplier route map

- [ ] **Step 1: Update supplier navigation**

Order links as Overview, Business Profile, Services, Inquiries, Quotes, Availability, Portfolio, Reviews, Jobs, Analytics. Add Browse Marketplace near the account section and preserve exact active-route matching.

- [ ] **Step 2: Relabel confirmed supplier work as Jobs**

Keep `/dashboard/supplier/bookings`; update metadata, title, description, panel copy, and empty states. Include service name when the existing `booking_suppliers.service_id` relationship supplies it.

- [ ] **Step 3: Build the read-only reviews page**

Show real average, count, rating distribution, published review cards, customer/event context available through `booking_suppliers`, and rating filtering. Render no create/edit/delete controls.

- [ ] **Step 4: Verify route access and active navigation**

Type-check and inspect desktop/mobile navigation behavior.

---

### Task 7: Overview, Analytics, and Shared Responsive Polish

**Files:**
- Modify: `apps/web/app/(supplier)/dashboard/supplier/page.tsx`
- Modify: `apps/web/src/components/dashboard/enterprise/SupplierOverview.tsx`
- Modify: `apps/web/app/(supplier)/dashboard/supplier/analytics/page.tsx`
- Modify: `apps/web/src/components/dashboard/enterprise/ui.tsx`
- Modify: `apps/web/src/features/suppliers/ui/SupplierProfileForm.tsx`
- Modify: `apps/web/src/features/suppliers/ui/SupplierPackageManager.tsx`
- Modify: `apps/web/src/features/suppliers/ui/SupplierPortfolioManager.tsx`

**Interfaces:**
- Consumes: real quote, inquiry, job, review, service, and profile data

- [ ] **Step 1: Correct overview metrics and sections**

Show new inquiries, pending quotes, accepted jobs, average rating, and confirmed revenue. Add recent inquiry detail links, upcoming jobs, profile completion based on actual missing fields, and quick actions to every core supplier workflow.

- [ ] **Step 2: Extend analytics with supported real metrics**

Add total inquiries, inquiry-to-quote conversion, quote status mix, accepted jobs, average rating, and existing confirmed revenue trends. Do not calculate response-time or location metrics unless source timestamps/fields make them accurate.

- [ ] **Step 3: Polish shared states and mobile layouts**

Keep compact typography and Venora colors. Ensure tables/cards/forms wrap at 320px width, actions remain tappable, drawers and sticky headers do not cover content, and charts use contained responsive dimensions.

- [ ] **Step 4: Run web type-check**

Run: `pnpm --filter @venora/web type-check`

Expected: PASS.

---

### Task 8: Final Review and Verification

**Files:**
- Review all files changed by Tasks 1-7

- [ ] **Step 1: Run focused supplier tests**

Run: `pnpm --filter @venora/web test -- src/features/suppliers`

Expected: PASS.

- [ ] **Step 2: Run required type-check**

Run: `pnpm --filter @venora/web type-check`

Expected: PASS.

- [ ] **Step 3: Run required production build**

Run: `pnpm --filter @venora/web build`

Expected: PASS, allowing documented pre-existing warnings.

- [ ] **Step 4: Scan for conflict markers**

Run: `git grep -n -E "^(<<<<<<<|=======|>>>>>>>)"`

Expected: no matches.

- [ ] **Step 5: Browser-test responsive supplier workflows**

Verify overview, profile, services, inquiries/detail, quotes, availability, portfolio, reviews, Jobs, and analytics at desktop and mobile widths. Confirm no horizontal overflow or fixed-content overlap. Verify a blocked date is rejected by the customer inquiry flow.

- [ ] **Step 6: Review the final diff for scope and security**

Confirm no dependency, auth, middleware, venue-owner booking, customer venue booking, admin, coordinator, or payment files changed outside explicitly required supplier integration.
