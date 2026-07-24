# Screen inventory

## Method and limits

Inventory evidence came from `apps/web/app`, layouts, `apps/web/proxy.ts`, the
admin middleware helper, navigation, feature components, Server Actions, and
`docs/api`. Anonymous runtime checks
covered `/`, `/venues`, `/suppliers`, `/login`, `/register`, `/forgot-password`,
`/pricing`, `/unauthorized`, and the framework 404 at widths from 360 to 1920 px.
Only six of those page routes are counted as fully verified; `/venues` and
`/suppliers` are partial because confirmed issues remain. Authenticated screens
and mutations are source-verified only.

The authoritative file-by-file list is the [route matrix](route-screen-matrix.md).

## Shared shells and global states

| Surface           | Source                                                             | Behavior                                             | State coverage                                         | Audit status                                              |
| ----------------- | ------------------------------------------------------------------ | ---------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------- |
| Root shell        | `apps/web/app/layout.tsx`                                          | Global metadata, fonts, providers, toasts            | Framework fallback only; no custom global error or 404 | Source-verified                                           |
| Marketing shell   | `apps/web/app/(marketing)/layout.tsx`                              | Marketing navigation, page content, footer           | No group loading/error state                           | Partially sound; runtime revealed nested `main` landmarks |
| Marketplace shell | `apps/web/src/components/layout/MarketplaceLayout.tsx`             | Marketing header, customer navigation, scroll region | No shared error boundary                               | Partially sound; mobile/desktop checked                   |
| Account shell     | `apps/web/app/(customer)/account/layout.tsx`                       | Auth guard and account navigation                    | Safe login redirect                                    | Source-verified                                           |
| Enterprise shell  | `apps/web/src/components/dashboard/enterprise/EnterpriseShell.tsx` | Role sidebar, top bar, mobile drawer                 | No shared loading/error boundary                       | Source-verified                                           |
| Admin shell       | `apps/web/app/(admin)/admin/layout.tsx`                            | Admin role check and permission-filtered navigation  | Safe `/unauthorized` redirect                          | Source-verified                                           |
| Venue-owner shell | `apps/web/app/(venue-owner)/dashboard/layout.tsx`                  | Venue-owner/admin role guard                         | Safe denial                                            | Source-verified                                           |
| Supplier shell    | `apps/web/app/(supplier)/dashboard/layout.tsx`                     | Supplier/admin role guard                            | Safe denial                                            | Source-verified                                           |
| Coordinator shell | `apps/web/app/(event-coordinator)/dashboard/layout.tsx`            | Coordinator/admin role guard                         | Safe denial                                            | Source-verified                                           |

Six route loading files exist: customer bookings, customer dashboard, favorites,
suppliers, venues, and venue-owner analytics. Other screens rely on inline pending
UI, React transitions, or the framework fallback. There are no route-level error
or custom not-found files.

## Public and authentication experience

| Family             | Routes                                                                                    | Purpose and entry                                            | Main actions and exits                                   | States and layout                                                                               | Status                                               |
| ------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Marketing          | `/`, `/about`, `/features`, `/pricing`, legal and resource pages                          | Explain Venora and enter marketplaces/auth                   | Browse venues/suppliers, register, login, footer links   | Responsive public layout; nested `main` on marketing pages                                      | Implemented; representative pages verified           |
| Venue discovery    | `/venues`                                                                                 | Search and filter venues from public navigation              | Filter, open venue, favorite, load more                  | Loading skeleton and empty filtering state; confirmed negative remaining-count/load-more defect | PARTIALLY IMPLEMENTED                                |
| Venue detail       | `/venues/[slug]`                                                                          | Review gallery, video, map, packages, reviews, nearby venues | Select package, favorite, start booking                  | Source includes detail states; no dedicated route error                                         | IMPLEMENTED BUT NOT RUNTIME-VERIFIED                 |
| Supplier discovery | `/suppliers`                                                                              | Find supplier profiles                                       | Search/filter, open supplier                             | Loading route; filter labels need programmatic association                                      | PARTIALLY IMPLEMENTED                                |
| Supplier profile   | `/suppliers/[slug]`                                                                       | Review services, portfolio, packages, rating                 | Start inquiry                                            | Source-verified; no route error boundary                                                        | IMPLEMENTED BUT NOT RUNTIME-VERIFIED                 |
| Authentication     | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/confirm` | Establish or recover identity                                | Submit, reveal password, resend/confirm, return to login | Form feedback exists; 32 px reveal controls; forgot-password has duplicate h1                   | Mixed: three runtime-verified, remaining source-only |
| Safe denial        | `/unauthorized`                                                                           | Explain insufficient access                                  | Return to appropriate surface                            | No `main` landmark                                                                              | IMPLEMENTED AND VERIFIED                             |
| Missing page       | Framework default                                                                         | Handle unknown URL                                           | Browser back only                                        | No custom branded recovery route                                                                | MISSING custom experience                            |

SEO metadata is exported directly by 80 of 100 pages. Root metadata enables indexing for all
routes; protected and auth pages do not define a consistent `noindex` policy.

## Customer experience

| Screen family       | Routes                                                                           | Main content and actions                                            | Data/actions                                 | State clarity                                                | Status                               |
| ------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------ | ------------------------------------ |
| Dashboard           | `/account/dashboard`; alias `/dashboard/customer`                                | Summary, next actions, activity                                     | Customer dashboard queries                   | Loading file; source-only                                    | Implemented; alias deprecated        |
| Profile/security    | `/account`, `/account/personal-details`, `/account/change-password`, `/settings` | Personal details, password, preferences                             | Auth/profile actions                         | Validation/toasts vary by form                               | IMPLEMENTED BUT NOT RUNTIME-VERIFIED |
| Privacy             | `/account/privacy`                                                               | Preference/data-operation cards                                     | No active operations                         | Explicit “Coming soon” controls                              | PLACEHOLDER                          |
| Favorites           | `/favorites`                                                                     | Saved venues                                                        | Favorite actions                             | Loading and empty state                                      | IMPLEMENTED BUT NOT RUNTIME-VERIFIED |
| Bookings            | `/bookings`, `/bookings/[id]`                                                    | Filters, status, timeline, conversation, map, next action           | Booking query/actions                        | Loading and empty list; detail handles invalid access        | IMPLEMENTED BUT NOT RUNTIME-VERIFIED |
| Booking progression | `/venues/[slug]/book`, `/bookings/[id]/confirmation`, `/payment`, `/review`      | Inquiry, approval result, checkout start/return, review eligibility | Booking/payment/review actions and webhooks  | State-dependent UI; webhook settlement is asynchronous       | IMPLEMENTED BUT NOT RUNTIME-VERIFIED |
| Cancellation/refund | `/bookings/[id]/cancel`, `/account/payments`, `/account/transactions`            | Cancellation request/history, payment documents, refund state       | Cancellation, payment refresh/refund actions | Implemented where eligible; no separate refund detail screen | IMPLEMENTED BUT NOT RUNTIME-VERIFIED |
| Supplier inquiries  | `/inquiries/[id]`; account aliases redirect                                      | Customer-supplier thread                                            | Inquiry actions                              | Canonical detail exists                                      | Implemented; two aliases deprecated  |
| Notifications       | `/notifications`                                                                 | Inbox/read state                                                    | Notification actions                         | Empty state present                                          | IMPLEMENTED BUT NOT RUNTIME-VERIFIED |

Booking state and action messaging exists across list/detail/timeline controls, but
the complete approval → payment → webhook sequence was not run. Receipt/invoice
handling is embedded in payments rather than exposed as dedicated routes.

## Venue-owner experience

| Family             | Routes                                       | Main content/actions                                                | Ownership and permission evidence                                                 | Status                               |
| ------------------ | -------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------ |
| Overview           | `/dashboard`                                 | KPIs, recent bookings, activity                                     | Layout requires venue-owner/admin; queries are owner-scoped                       | IMPLEMENTED BUT NOT RUNTIME-VERIFIED |
| Venue management   | `/dashboard/venues`, `/new`, `/[id]/edit`    | Create/edit/publish venue, media, amenities, policies               | Server Actions and RLS/ownership checks; media uses documented storage            | IMPLEMENTED BUT NOT RUNTIME-VERIFIED |
| Booking management | `/dashboard/bookings`, `/[id]`               | Inquiry review, approve/reject, payment status                      | State-machine actions and owner checks                                            | IMPLEMENTED BUT NOT RUNTIME-VERIFIED |
| Calendar/pricing   | `/dashboard/calendar`, `/dashboard/packages` | Availability, blackout dates, seasonal/package pricing              | Venue-scoped actions                                                              | IMPLEMENTED BUT NOT RUNTIME-VERIFIED |
| Team/reviews       | `/dashboard/staff`, `/dashboard/reviews`     | Staff access, customer review response context                      | Role/ownership constrained                                                        | IMPLEMENTED BUT NOT RUNTIME-VERIFIED |
| Analytics          | `/dashboard/analytics`                       | Revenue, booking, occupancy, conversion, packages, exports          | Venue-scoped analytics/export actions; empty states exist but runtime not checked | IMPLEMENTED BUT NOT RUNTIME-VERIFIED |
| Application        | `/account/become-partner`                    | Multi-step venue-owner/supplier application and verification upload | Auth guard, application/upload actions, documented private buckets                | IMPLEMENTED BUT NOT RUNTIME-VERIFIED |

The source enforces ownership below navigation. Payment displays operational
status, not raw credentials. Confirmation/result quality and analytics exports
require authenticated QA.

## Supplier experience

| Family               | Routes                                                                          | Main content/actions                                                                                      | Protected information behavior                               | Status                               |
| -------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------ |
| Overview/analytics   | `/dashboard/supplier`, `/analytics`                                             | KPIs, workload, performance                                                                               | Supplier/admin layout guard and supplier-scoped queries      | IMPLEMENTED BUT NOT RUNTIME-VERIFIED |
| Profile/services     | `/profile`, `/services`, `/portfolio`, `/portfolio/new`, `/portfolio/[id]/edit` | Categories, services, packages/pricing, areas, accreditation, portfolio creation/editing and media upload | Mutations are supplier-scoped                                | IMPLEMENTED BUT NOT RUNTIME-VERIFIED |
| Inquiries            | `/inquiries`, `/inquiries/[id]`                                                 | Event inquiry, snapshots, communication and response                                                      | Server query controls eligible booking/supplier relationship | IMPLEMENTED BUT NOT RUNTIME-VERIFIED |
| Quotes/jobs          | `/quotes`, `/quotes/[id]`, `/bookings`                                          | Prepare quote and track accepted work                                                                     | Supplier-scoped access                                       | IMPLEMENTED BUT NOT RUNTIME-VERIFIED |
| Availability/reviews | `/calendar`, `/reviews`                                                         | Availability and reputation                                                                               | Supplier-scoped actions                                      | IMPLEMENTED BUT NOT RUNTIME-VERIFIED |

Event date, start time, guest count, venue name, and event-location snapshots are
rendered as event information when returned by the eligible inquiry query. Source
checks restrict unrelated access; privacy behavior still needs authenticated
negative tests with separate suppliers.

## Event-coordinator experience

The coordinator has a guarded shell and five canonical pages: overview, events,
venues, suppliers, and reports. Venue/supplier discovery and reporting are
coordinator-specific surfaces; the legacy `/dashboard/event-coordinator` route
duplicates the overview. Dedicated booking detail, messaging, notification, and
account-settings modules are absent. The role is therefore **partially complete**,
not a full end-to-end coordination product.

## Administrator experience

The admin shell filters navigation by permission and every inspected module calls
a server-side permission guard. Dashboard, applications, users/details, venues/
details, suppliers/details, bookings, inquiries, reviews, reports, commissions,
marketplace, AI configuration, settings, administrators, and audit logs map to
real routes. Mutating review controls are permission-gated in addition to the
page guard.

`/admin/disputes` requires `disputes.view` and lists scoped cases with
lifecycle actions (`disputes.manage` / `disputes.resolve`). Customers raise
disputes from eligible bookings and track them at `/account/disputes`.
Payment/refund monitoring lives at `/admin/payments`. Runtime permission
tiers, confirmations, and destructive-action feedback were not exercised.
