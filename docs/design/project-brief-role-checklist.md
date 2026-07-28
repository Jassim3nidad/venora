# Project Brief — role capability checklist

Checklist of **Target Users** capabilities from the Venora Project Brief (v1.0)
against the **current codebase**. Use this for backlog triage; it is not a
runtime QA pass.

Last repository audit: **2026-07-28**, `main` through `b16471db`.

**Legend**

| Mark  | Meaning                                                      |
| ----- | ------------------------------------------------------------ |
| `[x]` | **Satisfied** — capability exists in product (source-backed) |
| `[~]` | **Partial** — surface exists but gaps vs brief intent        |
| `[ ]` | **Missing** — not shipped / Phase 2+ only                    |

Related: [role experience matrix](role-experience-matrix.md),
[marketplace relationships](marketplace-relationships-user-flow.md),
[overall system user flow](overall-system-user-flow.md),
[known limitations](../known-limitations.md).

---

## Summary

| Role                   | Brief fit                                                                        |
| ---------------------- | -------------------------------------------------------------------------------- |
| Customer               | Mostly satisfied                                                                 |
| Venue Owner            | Mostly satisfied                                                                 |
| Event Coordinator      | Mostly aligned (MVP + messaging + org staff invite path)                         |
| Accredited Supplier    | Marketplace, partnerships, and package association implemented; live E2E pending |
| Platform Administrator | Satisfied for Phase 1 admin surfaces                                             |

---

## Customer

- [x] Search venues — `/venues` filters and search
- [x] Compare venues — `/compare` side-by-side workspace
- [x] Save favorites — `/favorites` + heart actions
- [x] View pricing and packages — `/venues/[slug]`
- [x] Check availability — booking flow availability calendar
- [x] Submit inquiries — venue booking inquiry + supplier contact
- [x] Book venues — pending → approve → PayMongo → confirmed
- [x] Track booking status — `/bookings`, `/bookings/[id]`
- [x] Leave verified reviews — after completed booking

**Backlog (Customer)**

- [x] Side-by-side venue compare experience

---

## Venue Owner

- [x] Manage venue profiles — `/dashboard/venues`, create/edit
- [x] Upload photos and videos — venue media + public gallery/video
- [x] Configure packages and pricing — `/dashboard/packages`
- [x] Manage booking calendars — `/dashboard/calendar`
- [x] Receive inquiries — `/dashboard/bookings` pending pipeline
- [x] Accept or decline bookings — owner booking decision RPCs/UI
- [x] Manage staff — `/dashboard/staff` invite + venue assignment + permissions;
      accept via `/staff/accept` or coordinator dashboard; owner-only mutate
- [x] Monitor business analytics — `/dashboard/analytics`

**Backlog (Venue Owner)**

- [x] Complete staff invite / membership workflows end-to-end

---

## Event Coordinator

Brief: operational manager for one or more venue accounts (listings, bookings,
calendars, customer communication, suppliers, performance, reports).

- [~] Managing venue listings — org venue list/discovery; not full owner CRUD
- [x] Coordinating bookings — `/dashboard/coordinator/bookings` list + detail;
      approve/decline/complete when `manage_booking_decisions` is granted
- [x] Managing calendars — `/dashboard/coordinator/calendar`
- [x] Communicating with customers — Messages inbox with booking chats + venue
      inquiry threads (`/dashboard/coordinator/messages`, `/account/venue-inquiries`)
- [x] Coordinating accredited suppliers — discovery + attach to booking
      (`booking_suppliers` jobs path on VO/EC booking detail)
- [x] Monitoring booking performance — `/dashboard/coordinator/performance`
- [x] Generating operational reports — `/dashboard/coordinator/reports`
- [x] Settings / notifications — `/dashboard/coordinator/settings` + shell NotificationBell

**Notes**

- Customers **cannot hire** an Event Coordinator on Venora; EC is org staff after
  partner approval + organization membership. Become-partner and Settings copy
  state this explicitly.
- Role overall remains **PARTIALLY IMPLEMENTED** because coordinators do not own
  full venue CRUD or a customer-hire/global CRM product; org-scoped booking,
  messaging, supplier attachment, settings, and reporting surfaces exist.

**Backlog (Event Coordinator)**

- [x] Reliable org membership / invite onboarding (`/dashboard/staff` → email →
      `/staff/accept` or in-dashboard accept)
- [x] First-class booking + venue-inquiry customer messaging (ops-scoped; not global CRM)
- [x] Attach suppliers to venue bookings (`booking_suppliers` attach UI)
- [x] Deeper booking-performance analytics — revenue, occupancy, conversion,
      and popular-venue metrics scoped to assigned venues
- [x] Fix become-partner copy (EC = org staff, not hired)

---

## Accredited Suppliers

- [x] Create business profiles — partner apply + `/dashboard/supplier/profile`
- [x] Showcase services — `/dashboard/supplier/services` + public slug page
- [x] Portfolio — `/dashboard/supplier/portfolio`
- [x] Pricing — supplier packages/services pricing UI
- [x] Ratings / reviews — public ratings + supplier reviews dashboard
- [x] Contact — customer inquiry → supplier inbox/quotes
- [x] Accreditation status — profile field + admin accreditation
- [x] Customers browse suppliers — `/suppliers`
- [x] Participate in venue packages / venues associate suppliers — package
      builder, eligible-supplier selection, partnerships, and agreements exist;
      hosted verification remains tracked by the release QA matrix

**Backlog (Supplier / Phase 2)**

- [~] Venue listing association and package participation — UI and schema exist;
  hosted end-to-end verification remains
- [x] Attach suppliers onto a venue booking (`booking_suppliers`) as finished flow

---

## Platform Administrator

- [x] User verification — applications + users consoles
- [x] Venue approval — `/admin/venues`
- [x] Supplier accreditation — `/admin/suppliers`
- [x] Commission management — `/admin/commissions`
- [x] Reports — `/admin/reports` (+ audit logs)
- [x] AI settings — `/admin/ai-configuration`
- [x] Marketplace administration — `/admin/marketplace`
- [x] Payment monitoring — `/admin/payments` transactions, refunds, webhook attention
- [x] Disputes — scoped case management (`/admin/disputes`, customer raise +
      `/account/disputes`; lifecycle via `update_dispute_status`)

**Backlog (Admin)**

- [x] Dedicated payment / refund monitoring workspace
- [x] Complete disputes case management (scoped lifecycle; not full evidence suite)
- [x] Maya retired from application surfaces and configuration

---

## Phase mapping (brief roadmap)

### Phase 1 — Venue marketplace

- [x] Venue discovery / listings / search
- [x] Availability calendar
- [x] Booking requests (+ PayMongo deposit settlement)
- [x] Reviews (verified after complete)
- [x] Interactive calendar richness — tentative, reserved, maintenance, blackout,
      seasonal price override, notes, booking guards, and focused tests exist

### Phase 2 — Event ecosystem

- [x] Supplier marketplace browse + inquiry/quotes (customer↔supplier path)
- [x] Full venue↔supplier packaging / dynamic event packages — create/edit
      builder, supplier association, partnership workflows, and booking
      attachment exist; hosted verification remains tracked by release QA
- [x] Customer messaging — booking, venue-inquiry, and customer inbox paths exist
      (operations-scoped, not a global CRM)
- [x] Payment automation — PayMongo checkout, settlement, refunds, and monitoring
- [x] Commission management (admin surface exists)

### Phase 3–4 — Planning suite / AI event platform

- [~] Guest management — authenticated CRUD, CSV import/export, filters,
  statistics, RLS hardening, focused tests, and fail-closed hosted acceptance
  coverage exist; staging migrations are applied, but the exact-main protected
  browser run is blocked by Vercel build capacity
- [~] RSVP management — owner create/copy/revoke controls, deadlines, token-only
  public response RPCs, plus-ones, `/rsvp/[token]`, invitation delivery, and
  targeted reminder automation exist; hosted delivery is blocked by the invalid
  Resend credential and browser E2E awaits an exact-main deployment
- [~] Seating planner — authenticated table CRUD, capacity-aware guest
  assignment UI/actions, ownership hardening, focused tests, and staging
  multi-account acceptance coverage exist; the exact-main hosted run is pending
- [~] Event timeline planner — authenticated task CRUD, scheduling, owners,
  priorities, status filters, dependency UI, focused tests, and staging
  multi-account acceptance coverage exist; the exact-main hosted run is pending
- [~] AI Event Planner — the authenticated `/account/event-planner` workflow
  validates provider output, discloses deterministic fallback use, and has
  focused plus hosted acceptance coverage; the Qwen provider contract is live,
  but the exact-main customer workflow is not deployed
- [x] AI Budget Advisor — customer-facing venue cost estimation and the
      deterministic module exist; hosted Qwen output validation and provider/model,
      token, and integer-cost usage evidence pass
- [~] AI Supplier Matching — deterministic accredited-supplier ranking is
  integrated into the customer marketplace with focused and hosted acceptance
  coverage; live authorization/data evidence is pending
- [~] AI Concierge — the active customer widget streams through `ai-assistant`;
  customer-only cancellation proposals require explicit confirmation and persist
  service-only audit evidence; hosted Qwen streaming and usage evidence pass,
  while confirmed-tool browser execution awaits the exact-main deployment

---

## How to update

When a capability ships or is verified:

1. Change `[ ]` / `[~]` → `[x]` (or downgrade if regressing).
2. Adjust the one-line note if the route or product shape changes.
3. Keep [known limitations](../known-limitations.md) in sync for production blockers.
