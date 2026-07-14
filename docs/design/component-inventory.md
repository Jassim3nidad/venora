# Component inventory

## Canonical shared primitives

The package-level primitives in `packages/ui/src` are the preferred base for new
shared UI. Feature-level components should compose them rather than introduce a
third parallel primitive.

| Component            | Source                                               | Purpose / notable variants                    | Accessibility and responsive behavior                          | Duplicate or gap                           |
| -------------------- | ---------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------ |
| Button               | `packages/ui/src/button.tsx`                         | Primary, secondary, ghost, destructive, sizes | Native button semantics and focus styles                       | Bespoke page buttons remain                |
| Input / Form         | `packages/ui/src/input.tsx`, `form.tsx`              | Text fields, validation integration           | Supports labels/messages when composed correctly               | Some marketplace filters lack associations |
| Select               | `packages/ui/src/select.tsx`                         | Radix select variants                         | Keyboard-capable when canonical primitive is used              | Native/bespoke selects coexist             |
| Calendar             | `packages/ui/src/calendar.tsx`                       | Date selection                                | Keyboard behavior inherited from library                       | Feature calendars also exist               |
| Dialog               | `packages/ui/src/dialog.tsx`                         | Modal and confirmation surfaces               | Radix title, description, focus management                     | Custom mobile overlays are not dialogs     |
| Dropdown menu        | `packages/ui/src/dropdown-menu.tsx`                  | Action and profile menus                      | Keyboard-capable via Radix                                     | `ProfileMenu` is a feature wrapper         |
| Tabs                 | `packages/ui/src/tabs.tsx`                           | View/status switching                         | Radix tab semantics                                            | Bespoke filter tabs coexist                |
| Table                | `packages/ui/src/table.tsx`                          | Data grids                                    | Semantic table elements; horizontal strategy is consumer-owned | Admin pages vary in mobile treatment       |
| Card / Badge / Alert | `packages/ui/src/card.tsx`, `badge.tsx`, `alert.tsx` | Summary, status, feedback                     | Text accompanies status in most feature use                    | Status vocabulary varies by feature        |
| Toast                | `packages/ui/src/toast.tsx`                          | Mutation feedback                             | Live-region behavior depends on provider                       | Not every form path uses it consistently   |
| Chart                | `packages/ui/src/chart.tsx`                          | Chart container and tooltip helpers           | Consumer must supply descriptions and overflow handling        | Enterprise analytics has parallel charts   |
| Avatar / Separator   | `packages/ui/src/avatar.tsx`, `separator.tsx`        | Identity and structure                        | Radix semantics/fallback                                       | No material duplicate issue                |

No canonical shared combobox, general textarea export, pagination control,
breadcrumb, skeleton, empty-state, drawer, or error-state component was found in
the package inventory. Those patterns are implemented locally where needed.

## Shells and navigation

| Component           | Source                                                             | Used by                                | Behavior                                             | Recommendation                                                     |
| ------------------- | ------------------------------------------------------------------ | -------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| `MarketingNavbar`   | `apps/web/src/components/layout/MarketingNavbar.tsx`               | Marketing/public routes                | Desktop navigation and mobile overlay                | Keep canonical for public marketing; add focus-managed overlay     |
| `CustomerNavbar`    | `apps/web/src/components/layout/CustomerNavbar.tsx`                | Marketplace/customer routes            | Marketplace navigation, session actions, mobile menu | Keep canonical; make Help a link and audit target sizes            |
| `MarketplaceLayout` | `apps/web/src/components/layout/MarketplaceLayout.tsx`             | Venues/suppliers and customer surfaces | Fixed-height shell with internal scroll              | Avoid child `main` landmarks                                       |
| `EnterpriseShell`   | `apps/web/src/components/dashboard/enterprise/EnterpriseShell.tsx` | Owner, supplier, coordinator, admin    | Desktop sidebar, top bar, mobile drawer              | Canonical authenticated shell; add drawer semantics/focus handling |
| `ProfileMenu`       | `apps/web/src/components/layout/ProfileMenu.tsx`                   | Header variants                        | Session/profile actions                              | Retain wrapper over canonical menu                                 |
| `SiteFooter`        | `apps/web/src/components/layout/SiteFooter.tsx`                    | Marketing routes                       | Legal/resource exits                                 | Correct heading hierarchy and touch spacing                        |
| `Sidebar`           | `apps/web/src/components/layout/Sidebar.tsx`                       | Legacy/local use                       | Alternate sidebar implementation                     | Prefer `EnterpriseShell`; retire only after usage audit            |
| `VenuesMobileMenu`  | `apps/web/src/components/layout/VenuesMobileMenu.tsx`              | Venue marketplace                      | Compact filters/navigation                           | Consolidate with an accessible drawer pattern                      |

## Feature component families

| Family              | Representative sources                                                                | Screens                                       | Loading/error/empty behavior                                                             | Coupling or reuse finding                                          |
| ------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Booking             | `apps/web/src/components/booking/*`                                                   | Customer and owner booking list/detail/cancel | Filters, timeline, status, map, conversation, confirmations                              | Rich reusable family; state vocabulary should be centralized       |
| Venue               | `apps/web/src/components/venues/*`, `VenueMap.tsx`                                    | Marketplace, detail, booking                  | Gallery/video/map/packages/reviews/search/filter                                         | Venue card identity/load-more defects are integration issues       |
| Supplier            | `apps/web/src/components/suppliers/*`                                                 | Marketplace, profile, supplier dashboard      | Profile, packages, portfolio, inquiries, quotes, availability                            | Dashboard and marketplace forms use mixed primitives               |
| Partner application | `apps/web/src/components/partner-application/*`                                       | Become-partner wizard                         | Step validation, upload, review dialog, result                                           | Strong local flow; verification status needs runtime QA            |
| Notifications       | `apps/web/src/components/notifications/*`                                             | Inbox and header bell                         | Read/unread and empty state                                                              | No role-specific notification routes beyond shared inbox           |
| Payments            | `apps/web/src/components/payments/*`                                                  | Account payments/transactions/booking         | Document, refresh, refund controls and feedback                                          | Receipt/invoice/refund navigation is fragmented                    |
| Reviews             | `apps/web/src/components/reviews/*`                                                   | Customer submission, owner/admin review       | Eligibility, upload, moderation states                                                   | Status and eligibility messaging need cross-role QA                |
| Analytics           | `apps/web/src/components/analytics/*`, `dashboard/enterprise/ui/charts.tsx`           | Owner/supplier/admin dashboards               | KPI, charts, tables, heatmap, export                                                     | Parallel chart systems; canonical descriptions/empty states absent |
| Calendar            | `apps/web/src/components/calendar/*`                                                  | Owner/supplier availability                   | Calendar, blackout and schedule interactions                                             | Complex mobile/keyboard behavior not runtime-tested                |
| AI                  | `apps/web/src/components/ai/*`                                                        | Assistant, recommendations, estimator         | Inline pending/results                                                                   | Error/retry consistency needs feature QA                           |
| Uploads             | `VenuePhotoUpload.tsx`, `VenueVideoUpload.tsx`, partner upload components             | Venue and verification workflows              | Progress/preview/error vary by uploader                                                  | Consolidate contracts before visual refactor                       |
| Supplier image crop | `apps/web/src/features/suppliers/ui/SupplierImageUpload.tsx`, `ImageCropperModal.tsx` | Supplier profile logo/cover editing           | Radix manages modal focus; close/range lack accessible names and panning is pointer-only | Add labeled keyboard-operable crop controls before reuse           |

## Pattern gaps

- Empty states are repeated page-local implementations, so action placement and
  screen-reader text vary.
- Route loading coverage is sparse; page-local loading and disabled-submit
  patterns are inconsistent.
- No route-level error component provides a common recovery action.
- Tables, charts, and calendars need an explicit small-screen and accessible-name
  contract at their canonical wrappers.
- Custom mobile menus resemble drawers but do not reuse a focus-managed dialog.
- App-local enterprise primitives and `packages/ui` overlap. A later migration
  should pick canonical components per primitive without a broad visual rewrite.
