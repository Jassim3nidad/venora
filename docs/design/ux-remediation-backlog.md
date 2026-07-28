# UX remediation backlog

This backlog sequences confirmed work without authorizing it. Application code was
not changed during this audit.

## P1 — workflow integrity

| Order | Finding                        | Scope                                   | Acceptance and focused regression                                                                                           |
| ----: | ------------------------------ | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
|     1 | UX-02 venue identity mismatch  | Venue mapping/seed/query integration    | Every marketplace card’s ID/name/slug/detail/favorite/booking target agree; automated card-to-detail fixture test passes    |
|     2 | UX-01 negative load-more state | Venue marketplace client/pagination     | Remaining count never falls below zero; control hides at end; 0, exact-page, and multi-page tests pass                      |
|     3 | UX-03 sample supplier fallback | Supplier API/marketplace product policy | Database empty and database error are distinguishable; demo records cannot be mistaken for contactable production inventory |

## P2 — accessibility and recovery

| Order | Finding                                 | Scope                                   | Acceptance and focused regression                                                                                                      |
| ----: | --------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
|     4 | UX-04 dead Help control                 | Customer header                         | Semantic `/help` link works with pointer and keyboard; nav test passes                                                                 |
|     5 | UX-05/08/09 landmarks — **Done**        | Marketing, marketplace, forgot-password | One main and one h1 per tested page; no nested complementary filter regions; axe/landmark assertions pass                              |
|     6 | UX-07 supplier filter labels            | Supplier marketplace                    | Every visible field has a persistent associated label; accessible-name test passes                                                     |
|     7 | UX-06 mobile drawer behavior — **Done** | Public and enterprise shells            | Named modal drawer contains focus, closes with Escape, makes background inert, and restores trigger focus                              |
|     8 | UX-10 touch targets                     | Headers, auth, footer                   | Essential compact controls expose approximately 44 × 44 px activation areas without overflow at 320 px                                 |
|     9 | UX-25 supplier crop accessibility       | Supplier profile upload                 | Close/zoom controls are named; cropping supports keyboard positioning/reset; dialog focus and announcements pass                       |
|    10 | UX-11/16 shared failure states          | Root and route groups                   | Branded not-found and safe error recovery exist; loading/error text is announced; retry is idempotent-safe                             |
|    11 | UX-19 state/action vocabulary           | Booking/payment/cancel/review           | A tested mapping gives each state a reason, allowed next action, and stable cross-route label                                          |
|    12 | UX-15 payment document IA               | Customer booking/account                | Customer can find owned invoice, receipt, transaction, and refund state from booking and payment history                               |
|    13 | UX-17 admin finance requirements        | Admin product/RBAC                      | Approved role/permissions, data minimization, reconciliation states, audit needs, and route decision are documented before build       |
|    14 | UX-12 coordinator MVP                   | Coordinator product/RBAC                | Product explicitly scopes or implements event detail, coordination, messaging, notifications, and settings                             |
|    15 | UX-13 disputes availability             | Admin navigation/module                 | **Done** — scoped cases: raise from booking, `/account/disputes`, admin list/detail + `update_dispute_status` lifecycle (`disputes.*`) |
|    16 | UX-14 privacy page                      | Account privacy                         | Only supported operations are actionable; unavailable operations have honest support/recovery copy                                     |
|    17 | UX-18 provider capability               | Payment selector/copy                   | Only registered PayMongo appears; unregistered providers cannot be selected; provider contract test passes                             |

## P3 — consistency and maintenance

| Order | Finding                     | Acceptance                                                                                                           |
| ----: | --------------------------- | -------------------------------------------------------------------------------------------------------------------- |
|    18 | UX-20 route aliases         | Analytics show compatibility need; aliases redirect canonically; removal has migration plan                          |
|    19 | UX-21 primitive duplication | Each primitive has an owner/canonical implementation and incremental migration list                                  |
|    20 | UX-22 metadata policy       | Public pages are indexable as intended; auth/private routes are explicitly excluded consistently with robots/sitemap |
|    21 | UX-23 footer headings       | Heading outline remains logical without visual regression                                                            |
|    22 | UX-24 image priority        | Measured LCP improves and no unnecessary eager-load regression is introduced                                         |

## Required verification tracks

1. **Synthetic role matrix:** customer, two venue owners, two suppliers,
   coordinator, analyst/finance/super admin; verify negative ownership and
   permission cases without real data.
2. **Booking lifecycle:** inquiry → decision → PayMongo sandbox → webhook →
   receipt/invoice → cancellation/refund → completion/review, including duplicate
   and out-of-order events.
3. **Accessibility:** keyboard, NVDA/Firefox, VoiceOver/Safari, automated axe,
   contrast, forced colors, reduced motion, 200%/400% zoom.
4. **Responsive:** 320/360/430/768/1024/1440/1920 px with realistic long content,
   tables, dialogs, charts, calendars, and software keyboard.
5. **Observability:** confirm UI errors use privacy-safe references and that admin
   finance/governance actions create expected audit feedback.

## Definition of done for any remediation

- Root cause reproduced and linked to a backlog ID.
- Smallest behavior-preserving change is reviewed against auth, RLS, RBAC, and
  resource ownership.
- Focused tests cover success, failure, denied, loading, and empty states as
  applicable.
- Lint, type-check, tests, production build, API/OpenAPI validation, responsive
  checks, accessibility checks, and secret scan pass.
- Documentation status and evidence are updated without overstating runtime scope.
