# What to fix — prioritized rundown

Actionable backlog of gaps vs the Project Brief and known product/engineering
issues. Use alongside:

- [Project Brief role checklist](project-brief-role-checklist.md)
- [Known limitations](../known-limitations.md)
- [UX remediation backlog](ux-remediation-backlog.md)

**Priority key**

| Priority | Meaning                                            |
| -------- | -------------------------------------------------- |
| P0       | Blocks trust / wrong role access / production risk |
| P1       | Brief “must have” still missing or badly partial   |
| P2       | Important polish, Phase 2 ecosystem, or ops depth  |
| P3       | Nice-to-have / later roadmap                       |

Status: `[ ]` open · `[~]` in progress / partial · `[x]` done

---

## P0 — Fix first (integrity & trust)

### Role routing & access

- [x] **EC booking “View” links** — Events table links to coordinator-owned
      `/dashboard/coordinator/bookings/[id]` detail routes.
- [x] **Org membership for coordinators** — Staff invite / accept path is live:
      VO `/dashboard/staff` → email → `/staff/accept` (or in-dashboard accept).
      Remaining: runtime email delivery depends on Supabase Auth config.
- [x] **Venue card identity** — featured cards resolve live rows by the same
      venue ID used for slug/detail/favorite actions; focused regressions pass.

### Marketplace data honesty

- [x] **Supplier fallback inventory** — marketplace queries no longer import or
      return actionable sample supplier profiles; empty/error states stay explicit.
- [ ] **Authenticated QA matrix** — Run customer / owner / supplier / EC / admin
      fixtures; many paths are source-only, not runtime-verified.

### Payments / security (production)

- [x] **Maya retired** — no selectable provider, active webhook, environment
      contract, or admin enablement surface remains
- [ ] Confirm hosted **RLS / Storage / Edge** state before release.
- [~] **API rate limiting** — the active Next 16 proxy enforces validated per-IP,
  route-specific limits before auth/network work, with focused tests; globally
  distributed enforcement still needs production infrastructure.
- [x] **Storage ownership/validation** — repository policies use owned paths;
      direct uploads validate size, MIME, and file signatures. Hosted
      cross-tenant verification and provider malware scanning remain release work.

---

## P1 — Brief gaps that block “role contents satisfied”

### Event Coordinator (largest role gap)

- [x] Scope or ship **EC MVP**: event detail, coordination actions, messaging,
      notifications, settings (UX-12). Booking detail/actions live under
      `/dashboard/coordinator/bookings/[id]`; Messages inbox; NotificationBell;
      Settings at `/dashboard/coordinator/settings`. Approve/decline gated by
      `manage_booking_decisions` (not default for coordinators).
- [x] **Communicate with customers** as a first-class flow for venue ops:
      unified EC Messages inbox covers booking chats + replyable venue inquiry
      threads (`venue_inquiry_messages`). Still not a global CRM / Phase 2 suite.
- [x] Clarify product rule in UI: EC is **org staff**, not customer-hired
      (become-partner copy updated; Settings role card already states staff model).

### Venue Owner

- [x] Complete **staff invite + permissions** end-to-end (brief: Manage staff).
      Invite, venues, permissions, revoke/suspend, accept link + dashboard accept.

### Supplier ↔ Venue (Phase 2, but brief already lists it)

- [x] **Venues associate accredited suppliers** with listings — venue supplier
      management, partnership requests, package selection, and booking attachment
      use `venue_suppliers`.
- [x] **Attach suppliers to a booking** (`booking_suppliers`) — VO/EC booking
      detail attach form writes confirmed jobs; supplier Jobs lists them.

### Customer

- [x] **Compare venues** — `/compare` provides a side-by-side workspace with
      marketplace comparison controls.

### Administrator

- [x] **Dedicated payment / refund monitoring** workspace (brief: Payment
      monitoring) — `/admin/payments` with transactions, refunds, webhook attention;
      Maya has been retired from the application.
- [x] **Disputes** — scoped case management: customer raise from eligible
      booking, admin list/detail lifecycle (`open` → `under_review` →
      `resolved`/`rejected`), gated by `disputes.*` (UX-13).

---

## P2 — Product depth & ecosystem

### Calendar richness (brief § Interactive Venue Calendar)

- [x] Covered: tentative reservations, maintenance, seasonal pricing, blackout
      dates, owner editing, booking guards, and focused tests.

### Messaging & notifications

- [x] Unified **customer messaging** across current commercial surfaces:
      `/account/messages` aggregates booking, venue-inquiry, and supplier-inquiry
      histories and continues replies on their owned conversation routes.
- [x] Dedicated settings routes for owner / supplier / EC plus shared
      notification access in dashboard shells.

### Payments

- [x] Permanently retire **Maya**.
- [x] Customer **invoice / receipt / refund IA** — Billing & Payments is in the
      account navigation and booking payment detail exposes owned documents.

### Analytics

- [x] EC **booking performance** — scoped revenue, occupancy, conversion, and
      popular-venue metrics at `/dashboard/coordinator/performance`.
- [x] Admin marketplace-wide analytics vs brief — platform KPIs, revenue,
      commission, occupancy, conversion, packages, demographics, and exports
      live under `/admin/reports`; AI/error telemetry remains later observability.

### UX / a11y (from remediation backlog)

- [x] Help controls route to `/help` from public and account navigation.
- [x] Mobile drawers use named modal dialogs, contain focus, close with Escape,
      inert background content, and restore trigger focus (UX-06).
- [x] Supplier crop dialog controls are named; arrow-key positioning, zoom,
      reset, focus containment, and live announcements are covered (UX-25).
- [x] Shared branded 404 / error recovery (UX-10 / UX-11).
- [x] Shared public shells own the single `main` landmark; nested marketing and
      marketplace content uses neutral containers and page headings remain (UX-05/08/09).

---

## P3 — Later roadmap (brief Phase 3–4)

Do **not** block Phase 1 release on these unless product explicitly expands scope.

- [~] Guest management — CRUD/CSV UI, hardened migration, and focused tests exist;
  hosted migration and live E2E remain
- [~] RSVP management — owner create/copy/revoke controls, deadlines, token-only
  public response RPCs, plus-ones, and `/rsvp/[token]` exist; hosted migration,
  delivery/reminder automation, and live E2E remain
- [~] Seating planner — authenticated table CRUD, capacity-aware guest
  assignment UI/actions, ownership hardening, and focused tests exist; hosted
  migration and live multi-account E2E remain
- [~] Event timeline planner — authenticated task CRUD, scheduling, owners,
  priorities, status filters, and dependency UI exist; hosted migration and
  live multi-account E2E remain
- [~] AI Event Planner / Budget Advisor / Supplier Matching — authenticated event
  planning, venue cost estimation, and recommendation workflows are
  customer-facing; the accredited-supplier matcher remains unintegrated, and
  hosted provider/live-data behavior is unverified
- [~] AI Concierge — the active customer widget streams through `ai-assistant`;
  hosted provider behavior, role-aware mutation tools, confirmation, and audit
  evidence remain unverified
- [ ] Featured placements, sponsored listings, premium subscriptions
- [ ] Stripe (future payments)

---

## Suggested fix order (next 4–6 sprints)

| Order | Item                                       | Why                                      |
| ----: | ------------------------------------------ | ---------------------------------------- |
|     1 | Venue identity + supplier fallback honesty | Stops wrong bookings / fake inventory    |
|     2 | Disputes case management depth             | Admin ops trust                          |
|     3 | Venue↔supplier listing association         | Brief supplier “participate in packages” |
|     4 | Venue compare + calendar richness          | Customer brief polish                    |
|     5 | Messaging / notifications / a11y P2        | Ecosystem quality                        |

---

## Already fixed recently (do not re-open)

Keep for regression only:

- [x] EC calendar under `/dashboard/coordinator/calendar` (not VO shell)
- [x] Sticky multi-open marketplace filters; View Results mobile-only
- [x] Duplicate supplier “Recommended” sort removed
- [x] Auth popup for Bookings / Favorites / Host a Venue + favorite hearts
- [x] Staff invite + permissions E2E (VO Staff → accept → org membership)
- [x] Attach suppliers to booking (`booking_suppliers` VO/EC jobs path)
- [x] Admin payments & refunds monitoring workspace (`/admin/payments`)

---

## How to use this file

1. Pick the next open `[ ]` from **P0**, then **P1**.
2. When done, mark `[x]` here and update
   [project-brief-role-checklist.md](project-brief-role-checklist.md).
3. Log production blockers in [known-limitations.md](../known-limitations.md).
4. Prefer small PRs: one integrity fix or one role gap per PR.
