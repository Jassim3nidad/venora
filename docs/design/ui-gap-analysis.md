# UI gap analysis

Priorities: **P0** protected-data/security exposure, **P1** major workflow blocker,
**P2** important usability/accessibility defect, **P3** minor inconsistency or
enhancement. No P0 exposure was confirmed in this anonymous/source audit.

## Prioritized findings

| ID    | Priority | Route / role                        | Current behavior and evidence                                                                                                                                   | Expected behavior                                                                  | Recommended action                                                                                    |
| ----- | -------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| UX-01 | P1       | `/venues`; visitor/customer         | Runtime with all 11 cards still showed “Load more venues” and `-1 more venues available`; client initializes more-state independently of the rendered count     | Load-more is driven by authoritative pagination and never reports a negative value | Reconcile `visibleCount`, result length, and server `hasMore`; add boundary tests                     |
| UX-02 | P1       | `/venues`; visitor/customer         | Runtime card titled “Lyceum of the Philippines University - Cavite” linked to `/venues/the-blue-leaf-filipinas`; bundled/DB identity merge appears inconsistent | Card identity, slug, detail, favorite, and booking target refer to one venue       | Audit venue mapping/seed/merge keys before changing data; add card-to-detail identity test            |
| UX-03 | P1       | `/suppliers`; visitor/customer      | Public API falls back to bundled sample suppliers on database empty/error, which can make non-live inventory look actionable                                    | Empty/error is distinguished from production inventory                             | Remove production fallback or label non-actionable demo data; test contact/detail behavior            |
| UX-04 | P2       | Customer desktop header             | Help is a button with an accessible name but no handler/href; `/help` exists                                                                                    | Control navigates to help                                                          | Replace with semantic link to `/help` and add navigation test                                         |
| UX-05 | P2       | Marketing/marketplace pages         | Runtime exposes two `main` landmarks because shell and child own the landmark                                                                                   | One primary landmark                                                               | Assign ownership to shell or page consistently                                                        |
| UX-06 | P2       | Mobile public/enterprise navigation | Custom overlay/drawer lacks evident dialog semantics, focus containment, Escape close, and focus return                                                         | Fully keyboard-operable drawer                                                     | Compose with canonical dialog/drawer behavior and test focus cycle                                    |
| UX-07 | P2       | `/suppliers`                        | Runtime found five visible filter controls without programmatic label association                                                                               | Persistent visible labels are associated with controls                             | Add `label`/`htmlFor` or exact accessible names                                                       |
| UX-08 | P2       | `/venues`                           | Runtime exposes two h1 elements and nested complementary filter regions                                                                                         | One h1 and one labeled filter region                                               | Demote filter heading and remove nested `aside`                                                       |
| UX-09 | P2       | `/forgot-password`                  | Mobile runtime exposes two h1 headings                                                                                                                          | One page h1                                                                        | Demote decorative/value-panel heading                                                                 |
| UX-10 | P2       | Public/auth/footer                  | Password toggles are 32 × 32 px and many visible links about 16 px high                                                                                         | Robust touch activation areas                                                      | Increase hit area while preserving layout                                                             |
| UX-11 | P2       | Global                              | No route-level `error.tsx` or custom `not-found.tsx`; default 404 has no Venora recovery and no main landmark                                                   | Safe branded retry/home/browse recovery                                            | Add canonical error and not-found states after product copy review                                    |
| UX-12 | P2       | Coordinator                         | Overview/events/venues/suppliers/reports exist, but dedicated booking detail, messaging, notifications, and settings do not                                     | Role scope is explicit or end-to-end coordination is implemented                   | Define coordinator MVP; do not advertise absent workflows                                             |
| UX-13 | P2       | `/admin/disputes`                   | Scoped case management shipped: customer raise, account list, admin lifecycle via `update_dispute_status`                                                       | Navigation reflects availability or usable dispute cases exist                     | Done (scoped; not full evidence suite)                                                                |
| UX-14 | P2       | `/account/privacy`                  | Every preference/data operation is marked “Coming soon”                                                                                                         | Page offers supported controls or clearly routes to support                        | Remove inactive controls or implement supported privacy workflow                                      |
| UX-15 | P2       | Customer payments                   | Receipts, invoices, transactions, and refunds are distributed; no receipt/invoice/refund detail route                                                           | Booking state links clearly to owned document/refund detail                        | Define one payment-history information architecture and consistent status copy                        |
| UX-16 | P2       | Global async states                 | Six loading routes and zero route error files; empty/error/pending UI is page-local                                                                             | Predictable announced loading, empty, error, and retry states                      | Create canonical patterns and adopt incrementally                                                     |
| UX-17 | P2       | Admin finance                       | No dedicated payment/refund/webhook reconciliation module despite backend records                                                                               | Authorized finance users can trace operational payment state safely                | Define finance-monitoring requirements and permission model before UI work                            |
| UX-18 | P2       | Payment integration                 | Legacy database enum retains retired Maya and future Stripe values while only PayMongo is registered; customer UX advertises PayMongo only                      | Only operational providers are selectable/advertised                               | Preserve PayMongo-only messaging; remove legacy enum values only through a reviewed forward migration |
| UX-19 | P2       | Booking/payment/review              | Status/next-action UI is spread across list, detail, confirmation, payment, cancellation, and review components                                                 | One vocabulary explains current state, reason, and next action                     | Establish shared state-to-copy/action mapping and cross-route tests                                   |
| UX-20 | P3       | Aliases                             | Three redirect aliases and three re-export duplicates remain                                                                                                    | One canonical route per experience with intentional compatibility redirects        | Track usage, prefer redirects over re-exports, remove only after migration window                     |
| UX-21 | P3       | Enterprise components               | `packages/ui`, app-local enterprise primitives, and feature-local controls overlap                                                                              | Canonical primitive per pattern                                                    | Inventory consumers and migrate gradually; no broad restyle                                           |
| UX-22 | P3       | Protected/auth metadata             | Metadata coverage varies and root defaults apply broadly; crawl routes exist but page/group `noindex` intent is inconsistent                                    | Auth/private surfaces have explicit non-index policy                               | Reconcile metadata with `robots.ts` and sitemap behavior                                              |
| UX-23 | P3       | Marketing footer                    | Section headings use h6 after higher page headings                                                                                                              | Logical headings or labeled navigation regions                                     | Correct heading levels without visual change                                                          |
| UX-24 | P3       | Venue images                        | Browser logged above-fold LCP image priority warnings                                                                                                           | Actual LCP media is prioritized without eager-loading all cards                    | Measure, then set priority on only the true above-fold candidate                                      |
| UX-25 | P2       | Supplier profile image crop         | Source has an unnamed close icon, unlabeled zoom range, and pointer-only drag positioning in `ImageCropperModal`                                                | Crop dialog is named and fully operable with keyboard and assistive technology     | Label controls; add keyboard/reset positioning; test Radix focus and announcements                    |

## Missing conceptual screens

These are not counted as App Router page files:

- Branded global error and not-found recovery.
- Dedicated customer receipt, invoice, and refund-detail experiences.
- Dedicated coordinator booking/event detail, messaging, notifications, and
  account settings.
- Dedicated admin payment/refund/webhook reconciliation.
- Implemented admin dispute cases and escalation detail.
- Complete active privacy/data-request controls.
- Role-specific owner/supplier notification and account-setting destinations
  beyond shared surfaces.

## Duplicate and conflicting UI

- Customer dashboard and inquiry compatibility routes duplicate/redirect to
  canonical screens.
- Admin, event-coordinator, and venue-owner dashboard aliases re-export canonical
  pages rather than redirect.
- `EnterpriseShell` and a legacy `Sidebar` overlap.
- Package UI and enterprise-local controls/charts overlap.
- Custom mobile menus implement drawer-like behavior separately from the canonical
  dialog primitive.
- Booking/payment status wording is distributed across features.

## Confirmed non-findings and limits

- Admin navigation destinations resolve to real page routes; disputes uses
  scoped case management (`disputes.*`), not a placeholder.
- Footer destinations inspected in source resolve to implemented routes.
- Page and action permission checks exist in addition to admin navigation hiding.
- No protected-data exposure, horizontal document overflow, unnamed sampled
  button/link, or missing sampled image alt attribute was confirmed.
- Authenticated ownership, permission tiers, destructive confirmations, live
  payment, assistive technology, and multi-supplier privacy were not runtime-tested.
