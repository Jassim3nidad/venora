# Route-to-screen matrix

This matrix covers all 135 `page.tsx` files currently under `apps/web/app`.
“Source-only” means the route and guard were inspected but no authenticated
runtime claim is made. Detailed child components, actions, entities, and states
are summarized after the file-level matrix and in [screen inventory](screen-inventory.md).

Status abbreviations: **V** implemented and runtime-verified, **U** implemented
but not runtime-verified, **P** partially implemented, **PH** placeholder,
**DUP** duplicate, **DEP** deprecated.

## Administrator

| Route                     | Source                                                 | Screen                 | Access / page permission                          | Status | Runtime     |
| ------------------------- | ------------------------------------------------------ | ---------------------- | ------------------------------------------------- | ------ | ----------- |
| `/admin`                  | `apps/web/app/(admin)/admin/page.tsx`                  | Admin overview         | Admin; `admin.dashboard.view`                     | U      | Source-only |
| `/admin/administrators`   | `apps/web/app/(admin)/admin/administrators/page.tsx`   | Admin accounts         | Admin; `admin_accounts.view`                      | U      | Source-only |
| `/admin/ai-configuration` | `apps/web/app/(admin)/admin/ai-configuration/page.tsx` | AI configuration       | Admin; `ai_config.view`                           | U      | Source-only |
| `/admin/applications`     | `apps/web/app/(admin)/admin/applications/page.tsx`     | Partner applications   | Admin; `users.verify`                             | U      | Source-only |
| `/admin/audit-logs`       | `apps/web/app/(admin)/admin/audit-logs/page.tsx`       | Audit logs             | Admin; `audit_logs.view`                          | U      | Source-only |
| `/admin/bookings`         | `apps/web/app/(admin)/admin/bookings/page.tsx`         | Booking monitoring     | Admin; `marketplace.view`                         | U      | Source-only |
| `/admin/commissions`      | `apps/web/app/(admin)/admin/commissions/page.tsx`      | Commission management  | Admin; `commissions.view`                         | U      | Source-only |
| `/admin/disputes`         | `apps/web/app/(admin)/admin/disputes/page.tsx`         | Disputes               | Admin; `disputes.view`                            | I      | Source-only |
| `/admin/disputes/[id]`    | `apps/web/app/(admin)/admin/disputes/[id]/page.tsx`    | Dispute detail         | Admin; `disputes.view` (+ manage/resolve actions) | I      | Source-only |
| `/admin/inquiries`        | `apps/web/app/(admin)/admin/inquiries/page.tsx`        | Inquiry monitoring     | Admin; `marketplace.view`                         | U      | Source-only |
| `/admin/marketplace`      | `apps/web/app/(admin)/admin/marketplace/page.tsx`      | Marketplace monitoring | Admin; `marketplace.view`                         | U      | Source-only |
| `/admin/reports`          | `apps/web/app/(admin)/admin/reports/page.tsx`          | Reports                | Admin; `reports.view`                             | U      | Source-only |
| `/admin/reviews`          | `apps/web/app/(admin)/admin/reviews/page.tsx`          | Review moderation      | Admin; `marketplace.moderate`                     | U      | Source-only |
| `/admin/settings`         | `apps/web/app/(admin)/admin/settings/page.tsx`         | System settings        | Admin; `system_settings.view`                     | U      | Source-only |
| `/admin/suppliers`        | `apps/web/app/(admin)/admin/suppliers/page.tsx`        | Supplier management    | Admin; `suppliers.view`                           | U      | Source-only |
| `/admin/suppliers/[id]`   | `apps/web/app/(admin)/admin/suppliers/[id]/page.tsx`   | Supplier review        | Admin; `suppliers.view`                           | U      | Source-only |
| `/admin/users`            | `apps/web/app/(admin)/admin/users/page.tsx`            | User management        | Admin; `users.view`                               | U      | Source-only |
| `/admin/users/[id]`       | `apps/web/app/(admin)/admin/users/[id]/page.tsx`       | User details/roles     | Admin; `users.view`                               | U      | Source-only |
| `/admin/venues`           | `apps/web/app/(admin)/admin/venues/page.tsx`           | Venue management       | Admin; `venues.view`                              | U      | Source-only |
| `/admin/venues/[id]`      | `apps/web/app/(admin)/admin/venues/[id]/page.tsx`      | Venue review           | Admin; `venues.view`                              | U      | Source-only |
| `/dashboard/admin`        | `apps/web/app/(admin)/dashboard/admin/page.tsx`        | Admin overview alias   | Same as `/admin`                                  | DUP    | Source-only |

## Authentication

| Route              | Source                                         | Screen                     | Access               | Status | Runtime           |
| ------------------ | ---------------------------------------------- | -------------------------- | -------------------- | ------ | ----------------- |
| `/confirm`         | `apps/web/app/(auth)/confirm/page.tsx`         | Auth confirmation callback | Public callback      | U      | Source-only       |
| `/forgot-password` | `apps/web/app/(auth)/forgot-password/page.tsx` | Forgot password            | Public               | V      | Anonymous browser |
| `/login`           | `apps/web/app/(auth)/login/page.tsx`           | Login                      | Public               | V      | Anonymous browser |
| `/register`        | `apps/web/app/(auth)/register/page.tsx`        | Registration               | Public               | V      | Anonymous browser |
| `/reset-password`  | `apps/web/app/(auth)/reset-password/page.tsx`  | Reset password             | Public token flow    | U      | Source-only       |
| `/verify-email`    | `apps/web/app/(auth)/verify-email/page.tsx`    | Verification and resend    | Public/session-aware | U      | Source-only       |

## Customer, account, and marketplaces

| Route                         | Source                                                        | Screen                        | Access                                             | Status | Runtime           |
| ----------------------------- | ------------------------------------------------------------- | ----------------------------- | -------------------------------------------------- | ------ | ----------------- |
| `/account`                    | `apps/web/app/(customer)/account/page.tsx`                    | Account overview              | Authenticated                                      | U      | Source-only       |
| `/account/become-partner`     | `apps/web/app/(customer)/account/become-partner/page.tsx`     | Partner application wizard    | Authenticated                                      | U      | Source-only       |
| `/account/change-password`    | `apps/web/app/(customer)/account/change-password/page.tsx`    | Password/security             | Authenticated                                      | U      | Source-only       |
| `/account/dashboard`          | `apps/web/app/(customer)/account/dashboard/page.tsx`          | Customer dashboard            | Authenticated                                      | U      | Source-only       |
| `/account/inquiries`          | `apps/web/app/(customer)/account/inquiries/page.tsx`          | Inquiry list alias            | Authenticated; redirects to bookings supplier view | DEP    | Source-only       |
| `/account/inquiries/[id]`     | `apps/web/app/(customer)/account/inquiries/[id]/page.tsx`     | Inquiry detail alias          | Authenticated; redirects to canonical inquiry      | DEP    | Source-only       |
| `/account/payments`           | `apps/web/app/(customer)/account/payments/page.tsx`           | Payments/documents            | Authenticated                                      | U      | Source-only       |
| `/account/personal-details`   | `apps/web/app/(customer)/account/personal-details/page.tsx`   | Personal details              | Authenticated                                      | U      | Source-only       |
| `/account/privacy`            | `apps/web/app/(customer)/account/privacy/page.tsx`            | Privacy controls              | Authenticated                                      | PH     | Source-only       |
| `/account/seating`            | `apps/web/app/(customer)/account/seating/page.tsx`            | Seating planner               | Authenticated customer                             | U      | Source-only       |
| `/account/transactions`       | `apps/web/app/(customer)/account/transactions/page.tsx`       | Transactions/refunds          | Authenticated                                      | U      | Source-only       |
| `/bookings`                   | `apps/web/app/(customer)/bookings/page.tsx`                   | Customer bookings             | Authenticated                                      | U      | Source-only       |
| `/bookings/[id]`              | `apps/web/app/(customer)/bookings/[id]/page.tsx`              | Booking detail/timeline       | Booking participant                                | U      | Source-only       |
| `/bookings/[id]/cancel`       | `apps/web/app/(customer)/bookings/[id]/cancel/page.tsx`       | Cancellation request          | Eligible customer booking                          | U      | Source-only       |
| `/bookings/[id]/confirmation` | `apps/web/app/(customer)/bookings/[id]/confirmation/page.tsx` | Approval/booking confirmation | Booking participant                                | U      | Source-only       |
| `/bookings/[id]/payment`      | `apps/web/app/(customer)/bookings/[id]/payment/page.tsx`      | Payment start/return          | Eligible customer booking                          | U      | Source-only       |
| `/bookings/[id]/review`       | `apps/web/app/(customer)/bookings/[id]/review/page.tsx`       | Review submission             | Eligible customer booking                          | U      | Source-only       |
| `/dashboard/customer`         | `apps/web/app/(customer)/dashboard/customer/page.tsx`         | Customer dashboard alias      | Authenticated; redirects to account dashboard      | DEP    | Source-only       |
| `/favorites`                  | `apps/web/app/(customer)/favorites/page.tsx`                  | Saved venues                  | Authenticated                                      | U      | Source-only       |
| `/help`                       | `apps/web/app/help/page.tsx`                                  | Customer help                 | Public shell                                       | U      | Source-only       |
| `/inquiries/[id]`             | `apps/web/app/(customer)/inquiries/[id]/page.tsx`             | Supplier inquiry detail       | Inquiry participant                                | U      | Source-only       |
| `/notifications`              | `apps/web/app/(customer)/notifications/page.tsx`              | Notification inbox            | Authenticated                                      | U      | Source-only       |
| `/rsvp/[token]`               | `apps/web/app/rsvp/[token]/page.tsx`                          | Public guest RSVP             | Secret invitation token                            | U      | Source-only       |
| `/settings`                   | `apps/web/app/(customer)/settings/page.tsx`                   | Account/notification settings | Authenticated                                      | U      | Source-only       |
| `/suppliers`                  | `apps/web/app/(customer)/suppliers/page.tsx`                  | Supplier marketplace          | Public                                             | P      | Anonymous browser |
| `/suppliers/[slug]`           | `apps/web/app/(customer)/suppliers/[slug]/page.tsx`           | Supplier profile              | Public                                             | U      | Source-only       |
| `/venues`                     | `apps/web/app/(customer)/venues/page.tsx`                     | Venue marketplace             | Public                                             | P      | Anonymous browser |
| `/venues/[slug]`              | `apps/web/app/(customer)/venues/[slug]/page.tsx`              | Venue detail                  | Public                                             | U      | Source-only       |
| `/venues/[slug]/book`         | `apps/web/app/(customer)/venues/[slug]/book/page.tsx`         | Booking inquiry               | Authenticated customer                             | U      | Source-only       |

## Event coordinator

| Route | Source | Screen | Access | Status | Runtime |
| ----- | ------ | ------ | ------ | ------ | ------- |

## Marketing and legal

| Route                   | Source                                                   | Screen                   | Access | Status | Runtime                       |
| ----------------------- | -------------------------------------------------------- | ------------------------ | ------ | ------ | ----------------------------- |
| `/`                     | `apps/web/app/(marketing)/page.tsx`                      | Landing page             | Public | V      | Anonymous browser, six widths |
| `/about`                | `apps/web/app/(marketing)/about/page.tsx`                | About                    | Public | U      | Source-only                   |
| `/cancellation-options` | `apps/web/app/(marketing)/cancellation-options/page.tsx` | Cancellation information | Public | U      | Source-only                   |
| `/careers`              | `apps/web/app/(marketing)/careers/page.tsx`              | Careers                  | Public | U      | Source-only                   |
| `/design-system`        | `apps/web/app/(marketing)/design-system/page.tsx`        | Design-system showcase   | Public | U      | Source-only                   |
| `/features`             | `apps/web/app/(marketing)/features/page.tsx`             | Features                 | Public | U      | Source-only                   |
| `/hosting-resources`    | `apps/web/app/(marketing)/hosting-resources/page.tsx`    | Host resources           | Public | U      | Source-only                   |
| `/host-protection`      | `apps/web/app/(marketing)/host-protection/page.tsx`      | Host protection          | Public | U      | Source-only                   |
| `/newsroom`             | `apps/web/app/(marketing)/newsroom/page.tsx`             | Newsroom                 | Public | U      | Source-only                   |
| `/pricing`              | `apps/web/app/(marketing)/pricing/page.tsx`              | Pricing                  | Public | V      | Anonymous browser             |
| `/privacy`              | `apps/web/app/(marketing)/privacy/page.tsx`              | Privacy policy           | Public | U      | Source-only                   |
| `/safety`               | `apps/web/app/(marketing)/safety/page.tsx`               | Safety                   | Public | U      | Source-only                   |
| `/terms`                | `apps/web/app/(marketing)/terms/page.tsx`                | Terms                    | Public | U      | Source-only                   |

## Supplier

| Route                                     | Source                                                                    | Screen                 | Access                  | Status | Runtime     |
| ----------------------------------------- | ------------------------------------------------------------------------- | ---------------------- | ----------------------- | ------ | ----------- |
| `/dashboard/supplier`                     | `apps/web/app/(supplier)/dashboard/supplier/page.tsx`                     | Supplier overview      | Supplier/admin          | U      | Source-only |
| `/dashboard/supplier/analytics`           | `apps/web/app/(supplier)/dashboard/supplier/analytics/page.tsx`           | Supplier analytics     | Supplier/admin          | U      | Source-only |
| `/dashboard/supplier/bookings`            | `apps/web/app/(supplier)/dashboard/supplier/bookings/page.tsx`            | Supplier jobs          | Supplier/admin          | U      | Source-only |
| `/dashboard/supplier/calendar`            | `apps/web/app/(supplier)/dashboard/supplier/calendar/page.tsx`            | Availability           | Supplier/admin          | U      | Source-only |
| `/dashboard/supplier/inquiries`           | `apps/web/app/(supplier)/dashboard/supplier/inquiries/page.tsx`           | Supplier inquiries     | Supplier/admin          | U      | Source-only |
| `/dashboard/supplier/inquiries/[id]`      | `apps/web/app/(supplier)/dashboard/supplier/inquiries/[id]/page.tsx`      | Inquiry/event detail   | Eligible supplier/admin | U      | Source-only |
| `/dashboard/supplier/portfolio`           | `apps/web/app/(supplier)/dashboard/supplier/portfolio/page.tsx`           | Portfolio              | Supplier/admin          | U      | Source-only |
| `/dashboard/supplier/portfolio/new`       | `apps/web/app/(supplier)/dashboard/supplier/portfolio/new/page.tsx`       | Add portfolio project  | Supplier/admin          | U      | Source-only |
| `/dashboard/supplier/portfolio/[id]/edit` | `apps/web/app/(supplier)/dashboard/supplier/portfolio/[id]/edit/page.tsx` | Edit portfolio project | Supplier/admin          | U      | Source-only |
| `/dashboard/supplier/profile`             | `apps/web/app/(supplier)/dashboard/supplier/profile/page.tsx`             | Business profile       | Supplier/admin          | U      | Source-only |
| `/dashboard/supplier/quotes`              | `apps/web/app/(supplier)/dashboard/supplier/quotes/page.tsx`              | Quotes                 | Supplier/admin          | U      | Source-only |
| `/dashboard/supplier/quotes/[id]`         | `apps/web/app/(supplier)/dashboard/supplier/quotes/[id]/page.tsx`         | Quote detail           | Eligible supplier/admin | U      | Source-only |
| `/dashboard/supplier/reviews`             | `apps/web/app/(supplier)/dashboard/supplier/reviews/page.tsx`             | Supplier reviews       | Supplier/admin          | U      | Source-only |
| `/dashboard/supplier/services`            | `apps/web/app/(supplier)/dashboard/supplier/services/page.tsx`            | Services/packages      | Supplier/admin          | U      | Source-only |

## Venue owner

| Route                         | Source                                                           | Screen                     | Access                   | Status | Runtime     |
| ----------------------------- | ---------------------------------------------------------------- | -------------------------- | ------------------------ | ------ | ----------- |
| `/dashboard`                  | `apps/web/app/(venue-owner)/dashboard/page.tsx`                  | Venue-owner overview       | Venue owner/admin        | U      | Source-only |
| `/dashboard/analytics`        | `apps/web/app/(venue-owner)/dashboard/analytics/page.tsx`        | Venue analytics            | Venue owner/admin        | U      | Source-only |
| `/dashboard/bookings`         | `apps/web/app/(venue-owner)/dashboard/bookings/page.tsx`         | Venue bookings             | Venue owner/admin        | U      | Source-only |
| `/dashboard/bookings/[id]`    | `apps/web/app/(venue-owner)/dashboard/bookings/[id]/page.tsx`    | Venue booking review       | Owning venue owner/admin | U      | Source-only |
| `/dashboard/calendar`         | `apps/web/app/(venue-owner)/dashboard/calendar/page.tsx`         | Availability calendar      | Venue owner/admin        | U      | Source-only |
| `/dashboard/packages`         | `apps/web/app/(venue-owner)/dashboard/packages/page.tsx`         | Venue packages/pricing     | Venue owner/admin        | U      | Source-only |
| `/dashboard/reviews`          | `apps/web/app/(venue-owner)/dashboard/reviews/page.tsx`          | Venue reviews              | Venue owner/admin        | U      | Source-only |
| `/dashboard/staff`            | `apps/web/app/(venue-owner)/dashboard/staff/page.tsx`            | Staff access               | Venue owner/admin        | U      | Source-only |
| `/dashboard/venue-owner`      | `apps/web/app/(venue-owner)/dashboard/venue-owner/page.tsx`      | Venue-owner overview alias | Same as `/dashboard`     | DUP    | Source-only |
| `/dashboard/venues`           | `apps/web/app/(venue-owner)/dashboard/venues/page.tsx`           | Owned venues               | Venue owner/admin        | U      | Source-only |
| `/dashboard/venues/new`       | `apps/web/app/(venue-owner)/dashboard/venues/new/page.tsx`       | Create venue               | Venue owner/admin        | U      | Source-only |
| `/dashboard/venues/[id]/edit` | `apps/web/app/(venue-owner)/dashboard/venues/[id]/edit/page.tsx` | Edit venue                 | Owning venue owner/admin | U      | Source-only |

## Root utility routes

| Route            | Source                                | Screen              | Access               | Status | Runtime           |
| ---------------- | ------------------------------------- | ------------------- | -------------------- | ------ | ----------------- |
| `/429`           | `apps/web/app/429/page.tsx`           | Rate limit exceeded | Public safe fallback | V      | Anonymous browser |
| `/profile/setup` | `apps/web/app/profile/setup/page.tsx` | Profile/role setup  | Authenticated        | U      | Source-only       |
| `/unauthorized`  | `apps/web/app/unauthorized/page.tsx`  | Permission denied   | Public safe fallback | V      | Anonymous browser |

## UI-supporting non-page routes

These routes do not add to the 98-page count. Their detailed request/response and
authorization contracts are in the [endpoint inventory](../api/endpoint-inventory.md).

| Route handler or generated route                                                    | UI flow affected                                               | Access / behavior                                                                    |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `/auth/callback`, `/logout`                                                         | Verification/OAuth handoff and sign-out                        | One-time public callback or current-session sign-out; safe redirect handling         |
| `/api/bookings`, `/api/bookings/[id]/status`                                        | Booking list, inquiry, owner decision, cancellation/completion | Authenticated; state-machine/RLS authorization                                       |
| `/api/bookings/[id]/payment`, `/api/bookings/[id]/refund`                           | Checkout and refund progression                                | Eligible booking participant; provider-backed workflow                               |
| `/api/venues`                                                                       | Venue marketplace                                              | Public validated read                                                                |
| `/api/suppliers`, `/api/suppliers/[id]`, `/api/suppliers/[id]/contact`              | Supplier marketplace/detail/contact                            | Public reads; authenticated validated contact mutation                               |
| `/api/notifications`, `/api/notifications/[id]/read`, `/api/notifications/read-all` | Notification bell/inbox                                        | Authenticated current-user records                                                   |
| `/api/notifications/push-public-key`, `/api/notifications/push-subscriptions`       | Push opt-in                                                    | Public key read; authenticated subscription mutations                                |
| `/api/notification-preferences`                                                     | Notification settings                                          | Authenticated current-user GET/PATCH                                                 |
| `/api/analytics/venue-owner/export`                                                 | Owner/coordinator analytics export                             | Venue owner, coordinator, or admin; scoped CSV/PDF                                   |
| `/api/admin/reports/export`                                                         | Admin report export                                            | `reports.export`; writes export/audit records                                        |
| `/api/webhooks/paymongo`                                                            | Payment/refund settlement shown in booking UI                  | Signed PayMongo provider callbacks                                                   |
| `/api/debug`                                                                        | No supported screen                                            | Unguarded diagnostic surface documented as an API risk; should not become navigation |
| `/robots.txt`, `/sitemap.xml`                                                       | Public search discovery                                        | Generated crawl policy and public sitemap                                            |

## Screen-family integration details

| Family                      | Important child components                                            | Server Actions / APIs                                                                       | Main entities                                                                  | Loading / error / empty                                   | Responsive / accessibility                                              |
| --------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------- | ----------------------------------------------------------------------- |
| Auth                        | Auth forms, avatar/setup wizard                                       | Supabase auth callbacks and profile actions; see [authentication](../api/authentication.md) | `auth.users`, profiles, roles                                                  | Inline pending/errors; no route error                     | Labeled forms; password targets small; heading issue on forgot-password |
| Venue marketplace/detail    | Filters, cards, gallery, video, map, packages, reviews                | Venue/favorite/booking actions                                                              | venues, media, amenities, packages, availability, reviews                      | Venue loading file; filter empty state; no route error    | Responsive grid; duplicate landmarks/headings; load-more defect         |
| Supplier marketplace/detail | Filters, cards, profile, packages, portfolio                          | Supplier/inquiry actions                                                                    | suppliers, services, packages, portfolio, reviews                              | Supplier loading file; empty results                      | Responsive grid; filter label association gap                           |
| Customer booking            | Filter controls, timeline, status, conversation, map, cancel controls | Booking, payment, cancellation, review actions; payment Route Handlers/webhooks             | bookings, booking events, payments, refunds, reviews, notifications            | List loading/empty; detail state messages; no route error | Source-only; complex status/action sequence needs assistive QA          |
| Partner application         | Wizard, uploads, review dialog                                        | Application and upload actions; see [storage](../api/storage.md)                            | applications, verification documents, partner profiles                         | Step validation, pending and result states                | Dialog/upload keyboard behavior unverified                              |
| Enterprise dashboards       | `EnterpriseShell`, overview cards, charts, tables                     | Role-scoped dashboard/analytics/report actions                                              | role-specific aggregates                                                       | Inline/feature states; analytics loading file only        | Sidebar/drawer breakpoints; mobile drawer focus gap                     |
| Venue operations            | Venue forms, media uploads, calendar, packages, booking review        | Venue CRUD/media/availability/package/booking actions                                       | venues, media, availability, pricing, bookings                                 | Form feedback and empty lists; no route error             | Dense forms/calendar/table require authenticated responsive QA          |
| Supplier operations         | Profile/services/portfolio, inquiry snapshot, quote forms, calendar   | Supplier profile/service/inquiry/quote/availability actions                                 | suppliers, services, inquiries, snapshots, quotes                              | Inline states; no route loading files                     | Event privacy and long snapshot content need multi-account QA           |
| Admin governance            | Review action bar, tables, filters, details, settings                 | Permission-guarded admin actions                                                            | users, roles, permissions, applications, bookings, commissions, logs, disputes | Page-local empty/errors                                   | Tables/dialogs and destructive feedback source-only                     |
| Notifications               | Bell, inbox, preferences                                              | Notification read/preferences actions                                                       | notifications, preferences                                                     | Inbox empty state                                         | Live announcement and focus behavior unverified                         |

## Count reconciliation

The baseline contains 135 page files. There are no page files classified as
MISSING, INACCESSIBLE, or BLOCKED. Missing conceptual experiences are listed in
[UI gap analysis](ui-gap-analysis.md).

## Routes added after the original matrix audit

These source-only routes extend the original classified matrix:

- `apps/web/app/(admin)/admin/payments/page.tsx`
- `apps/web/app/(customer)/account/disputes/page.tsx`
- `apps/web/app/(customer)/account/guests/page.tsx`
- `apps/web/app/(customer)/account/messages/page.tsx`
- `apps/web/app/(customer)/account/seating/page.tsx`
- `apps/web/app/(customer)/account/venue-inquiries/page.tsx`
- `apps/web/app/(customer)/account/venue-inquiries/[id]/page.tsx`
- `apps/web/app/(customer)/compare/page.tsx`
- `apps/web/app/(customer)/dashboard/planning/guests/page.tsx`
- `apps/web/app/(customer)/inquiries/[id]/review/page.tsx`
- `apps/web/app/(customer)/owners/[slug]/page.tsx`
- `apps/web/app/(customer)/partners/[slug]/page.tsx`
- `apps/web/app/(supplier)/dashboard/supplier/partnerships/page.tsx`
- `apps/web/app/(supplier)/dashboard/supplier/settings/page.tsx`
- `apps/web/app/(supplier)/dashboard/supplier/venues/page.tsx`
- `apps/web/app/(supplier)/dashboard/supplier/venues/[venueId]/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/bookings/[id]/assign-supplier/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/business-profile/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/business-profile/preview/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/coordinator/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/coordinator/bookings/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/coordinator/bookings/[id]/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/coordinator/bookings/[id]/assign-supplier/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/coordinator/calendar/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/coordinator/messages/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/coordinator/performance/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/coordinator/reports/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/coordinator/settings/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/coordinator/suppliers/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/coordinator/suppliers/requests/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/coordinator/suppliers/[supplierId]/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/coordinator/venues/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/packages/new/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/packages/[id]/edit/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/venue-owner/settings/page.tsx`
- `apps/web/app/(venue-owner)/dashboard/venues/[id]/suppliers/page.tsx`
- `apps/web/app/auth/session/page.tsx`
- `apps/web/app/help/page.tsx`
- `apps/web/app/rsvp/[token]/page.tsx`
- `apps/web/app/staff/accept/page.tsx`
