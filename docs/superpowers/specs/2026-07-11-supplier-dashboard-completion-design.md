# Supplier Dashboard Completion Design

## Goal

Complete Venora's supplier workspace without rebuilding working supplier features. Approved suppliers can manage their public business presence, services, inquiries, quotes, availability, portfolio, reviews, notifications, accepted jobs, and analytics through a responsive dashboard that uses real data and preserves existing auth and RLS behavior.

## Existing Foundation

The implementation will retain and improve these existing capabilities:

- Canonical supplier route and role redirect: `/dashboard/supplier`
- Shared `EnterpriseShell` desktop sidebar and mobile drawer
- Supplier overview backed by real inquiry, service, booking, and analytics data
- Supplier profile create/update flow using `supplier_profiles`
- Service/package management using `supplier_services`
- Portfolio management using `supplier_portfolio_items`
- Direct customer inquiries using `supplier_contact_requests`
- Venue-coordinated supplier requests and accepted work using `booking_suppliers`
- Supplier reviews stored in `supplier_reviews`
- Existing notification infrastructure and analytics components

The existing `/dashboard/supplier/bookings` route remains stable, but its supplier-facing navigation and page copy will use the label **Jobs** because it represents confirmed supplier work rather than venue booking management.

## Architecture

Use incremental domain completion. Existing profile, service, portfolio, inquiry, job, analytics, authentication, RBAC, and notification code remains authoritative. Missing functionality is added in focused supplier feature modules and routes, using the current server component, server action, Supabase, Zod, and dashboard component patterns.

All supplier mutations derive the supplier profile from the authenticated user on the server. Client-provided supplier, customer, inquiry, booking, or message ownership identifiers are never trusted without a server-side relationship check.

No packages are installed. `package.json` and `pnpm-lock.yaml` remain unchanged.

## Data Model

Reuse these tables:

- `supplier_profiles`
- `supplier_services`
- `supplier_portfolio_items`
- `supplier_contact_requests`
- `booking_suppliers`
- `supplier_reviews`
- Existing notification tables

Add one safe migration for domains that do not currently exist:

### Supplier Quotes

`supplier_quotes` stores a quote linked to one direct supplier inquiry. It records the supplier, customer, title, service description, subtotal, additional fees, total, validity date, notes, status, and timestamps. Allowed statuses are `draft`, `sent`, `accepted`, `declined`, `expired`, and `withdrawn`.

`supplier_quote_items` stores ordered line items with description, quantity, unit price, and line total. Database checks prevent negative quantities and amounts. A quote's supplier and customer relationships must match its inquiry.

Suppliers may create and edit drafts, send drafts, and withdraw eligible sent quotes. They cannot mark their own quote accepted or declined. Customer acceptance is not represented unless a real customer-side action performs that transition.

### Inquiry Messages

`supplier_inquiry_messages` stores text-only messages linked to `supplier_contact_requests`. Each row records the inquiry, sender, message body, and creation timestamp. Only the inquiry customer and owning supplier account may read messages. Inserts require `sender_id = auth.uid()` and membership in the inquiry.

### Supplier Availability

`supplier_availability` stores one row per supplier and date with a status, optional reason, creator, and timestamps. Allowed manual statuses are `available`, `unavailable`, and `blocked`. Confirmed `booking_suppliers` work is projected into the calendar as `booked`; it is not duplicated into the manual table.

A unique constraint on `(supplier_id, date)` prevents conflicting manual entries. Deleting or clearing a manual row restores the default available state unless a confirmed job occupies the date.

## Navigation and Shell

Supplier navigation order:

1. Overview
2. Business Profile
3. Services
4. Inquiries
5. Quotes
6. Availability
7. Portfolio
8. Reviews
9. Jobs
10. Analytics

The supplier shell keeps Venora branding, blue active navigation, marketplace access, notification access, account summary, and sign out. Venue-owner-only items never appear. Desktop uses the persistent sidebar. Tablet and mobile use the existing drawer, with content width, overflow, wrapping, and tap-target fixes so navigation never covers the page.

## Page Workflows

### Overview

Show real new inquiry, pending quote, accepted job, average rating, and confirmed revenue metrics. Include recent inquiries, upcoming jobs, profile completion, quick actions, and performance summaries. Missing data renders as zero or a clear empty state, never fabricated values.

### Business Profile

Retain the existing profile form and schema-backed fields. Improve sectioning, validation, success feedback, image preview behavior where supported, and responsive stacking. Suppliers can edit only the profile tied to their authenticated account.

### Services

Retain `supplier_services` as the service/package source. Support create, edit, activate/archive, and public visibility behavior already established by the marketplace. Improve card actions, status presentation, empty state, and mobile layout. Do not introduce a second package system.

### Inquiries

The list supports search, existing-status filtering, and sorting by newest or event date. A new `/dashboard/supplier/inquiries/[id]` page displays customer information, approved booking and venue snapshots, event date/time/location, guest count, requested service, message, status timeline, message thread, and related quote actions.

Only the owning supplier can open or mutate an inquiry. Existing `inquiry_status` database values remain unchanged and receive supplier-friendly visual labels.

### Quotes

`/dashboard/supplier/quotes` lists and filters real quotes. Quote creation starts from an owned inquiry. Drafts can be edited and sent; sent quotes can be viewed and withdrawn when eligible. Accepted, declined, expired, and withdrawn quotes are read-only for suppliers. The system does not fake customer acceptance.

### Availability

`/dashboard/supplier/calendar` reuses Venora's existing calendar components and date utilities. Suppliers can select a date, set available, unavailable, or blocked, add a reason, save, or clear the override. Confirmed jobs appear as booked and cannot be manually made available.

The public supplier inquiry form disables known unavailable dates. The inquiry server action performs the authoritative check immediately before insert and rejects unavailable, blocked, or confirmed-job dates with: `This supplier is unavailable on the selected date. Please choose another date.`

### Portfolio

Retain existing add, edit, delete, featured, ordering, and public rendering behavior supported by `supplier_portfolio_items`. Improve the empty state, card controls, confirmation behavior, and mobile layout. Reuse existing image and storage patterns; do not add an uploader dependency.

### Reviews

`/dashboard/supplier/reviews` reads published `supplier_reviews` for the authenticated supplier. It shows average rating, count, rating distribution, recent reviews, and filters by rating or service when the existing relationships provide service data. Suppliers cannot create, edit, or delete customer reviews.

### Jobs

The current `/dashboard/supplier/bookings` route remains unchanged for links and compatibility. Its UI title and navigation label become Jobs. It shows confirmed `booking_suppliers` work with event date, customer, venue, service, price, and status.

### Analytics

Retain existing analytics queries and chart components. Add inquiry, quote, accepted-job, rating, conversion, and response metrics only where real records and timestamps support correct calculation. Revenue includes confirmed supplier work only. Insufficient data produces a polished empty state.

## Notifications

Reuse Venora's existing notification infrastructure for new inquiries, inquiry replies, sent quotes, quote status changes where customer actions exist, upcoming jobs, and reviews. Notification creation is best-effort and occurs after the primary action. Notification failure never rolls back or blocks inquiry, quote, message, profile, service, portfolio, or availability changes.

## Security and RLS

The migration enables RLS and adds narrowly scoped policies:

- Suppliers may CRUD quotes only for inquiries addressed to their supplier profile.
- Customers may read quotes only for inquiries they own.
- Suppliers and customers may read messages only when they participate in the inquiry.
- Message inserts require `sender_id = auth.uid()` and inquiry participation.
- Suppliers may CRUD availability only for their own supplier profile.
- Existing admin access is preserved only through established `is_admin()` patterns.

Server actions independently validate the same relationships before writes. Public clients never receive service-role credentials, and no RLS policy is weakened.

## Errors and Revalidation

Every page distinguishes loading, empty, permission, and query failure states. Forms show field validation and actionable mutation errors. Unauthorized records behave as unavailable rather than exposing private ownership details.

Mutations revalidate only affected routes, including supplier overview, inquiry detail/list, quotes, availability, jobs, analytics, public supplier detail, and customer inquiry surfaces as appropriate.

## Responsive Design

All supplier pages use the existing Venora white and light-blue dashboard language, compact page headers, soft borders, restrained shadows, consistent status badges, and readable spacing. Tables use mobile cards or horizontal containment where necessary. Forms stack at small widths, header actions wrap, dialogs stay within the viewport, charts keep minimum readable dimensions, and no fixed element covers content.

## Testing and Verification

Automated tests will cover server-side ownership and status-transition helpers where the repository's current test setup supports them, including:

- Supplier cannot manage another supplier's inquiry, quote, availability, or portfolio.
- Customer cannot read another customer's quotes or inquiry messages.
- Message sender must be the authenticated participant.
- Blocked or unavailable dates reject customer inquiry submission.
- Confirmed supplier jobs block the same date.
- Draft quotes can be edited and sent; finalized quotes cannot be supplier-edited.

Manual browser verification covers desktop, tablet, and mobile supplier navigation and all changed workflows. Final checks are:

```text
pnpm --filter @venora/web type-check
pnpm --filter @venora/web build
git grep -n -E "^(<<<<<<<|=======|>>>>>>>)"
```

## Out of Scope

- Rebuilding working customer, venue owner, coordinator, admin, auth, middleware, payment, or venue booking features
- Global real-time chat, attachments, typing indicators, or presence
- Supplier self-acceptance of quotes
- New dependencies or calendar/chart libraries
- Destructive database changes
