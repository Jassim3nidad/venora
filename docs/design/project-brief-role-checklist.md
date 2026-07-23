# Project Brief — role capability checklist

Checklist of **Target Users** capabilities from the Venora Project Brief (v1.0)
against the **current codebase**. Use this for backlog triage; it is not a
runtime QA pass.

**Legend**

| Mark | Meaning |
| ---- | ------- |
| `[x]` | **Satisfied** — capability exists in product (source-backed) |
| `[~]` | **Partial** — surface exists but gaps vs brief intent |
| `[ ]` | **Missing** — not shipped / Phase 2+ only |

Related: [role experience matrix](role-experience-matrix.md),
[marketplace relationships](marketplace-relationships-user-flow.md),
[overall system user flow](overall-system-user-flow.md),
[known limitations](../known-limitations.md).

---

## Summary

| Role | Brief fit |
| ---- | --------- |
| Customer | Mostly satisfied (compare is the main gap) |
| Venue Owner | Mostly satisfied (staff invite depth partial) |
| Event Coordinator | Only partially aligned |
| Accredited Supplier | Profile/marketplace yes; venue-package association no |
| Platform Administrator | Mostly satisfied (payment monitor / disputes gaps) |

---

## Customer

- [x] Search venues — `/venues` filters and search
- [~] Compare venues — favorites/shortlist only; no side-by-side compare
- [x] Save favorites — `/favorites` + heart actions
- [x] View pricing and packages — `/venues/[slug]`
- [x] Check availability — booking flow availability calendar
- [x] Submit inquiries — venue booking inquiry + supplier contact
- [x] Book venues — pending → approve → PayMongo → confirmed
- [x] Track booking status — `/bookings`, `/bookings/[id]`
- [x] Leave verified reviews — after completed booking

**Backlog (Customer)**

- [ ] Side-by-side venue compare experience

---

## Venue Owner

- [x] Manage venue profiles — `/dashboard/venues`, create/edit
- [x] Upload photos and videos — venue media + public gallery/video
- [x] Configure packages and pricing — `/dashboard/packages`
- [x] Manage booking calendars — `/dashboard/calendar`
- [x] Receive inquiries — `/dashboard/bookings` pending pipeline
- [x] Accept or decline bookings — owner booking decision RPCs/UI
- [~] Manage staff — `/dashboard/staff` exists; invite/org-attach incomplete
- [x] Monitor business analytics — `/dashboard/analytics`

**Backlog (Venue Owner)**

- [ ] Complete staff invite / membership workflows end-to-end

---

## Event Coordinator

Brief: operational manager for one or more venue accounts (listings, bookings,
calendars, customer communication, suppliers, performance, reports).

- [~] Managing venue listings — org venue list/discovery; not full owner CRUD
- [~] Coordinating bookings — Events list/detail; coordination product incomplete
- [x] Managing calendars — `/dashboard/coordinator/calendar`
- [~] Communicating with customers — some booking conversation; no full messaging CRM
- [~] Coordinating accredited suppliers — discovery only; attach-to-booking unfinished
- [~] Monitoring booking performance — overview/pipeline; not full analytics suite
- [x] Generating operational reports — `/dashboard/coordinator/reports`

**Notes**

- Customers **cannot hire** an Event Coordinator on Venora; EC is org staff after
  partner approval + organization membership.
- Role overall remains **PARTIALLY IMPLEMENTED** in the experience matrix.

**Backlog (Event Coordinator)**

- [ ] Reliable org membership / invite onboarding
- [ ] First-class booking coordination + messaging
- [ ] Attach suppliers to venue bookings (Phase 2)
- [ ] Deeper booking-performance analytics

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
- [ ] Participate in venue packages / venues associate suppliers — schema Phase 2; no finished attach UI

**Backlog (Supplier / Phase 2)**

- [ ] Venue listing association (`venue_suppliers` or equivalent product UI)
- [ ] Attach suppliers onto a venue booking (`booking_suppliers`) as finished flow

---

## Platform Administrator

- [x] User verification — applications + users consoles
- [x] Venue approval — `/admin/venues`
- [x] Supplier accreditation — `/admin/suppliers`
- [x] Commission management — `/admin/commissions`
- [x] Reports — `/admin/reports` (+ audit logs)
- [x] AI settings — `/admin/ai-configuration`
- [x] Marketplace administration — `/admin/marketplace`
- [~] Payment monitoring — no dedicated module; signals elsewhere; Maya incomplete
- [~] Disputes — placeholder route (not full case management)

**Backlog (Admin)**

- [ ] Dedicated payment / refund monitoring workspace
- [ ] Complete disputes case management
- [ ] Finish Maya (or keep disabled) before production enablement

---

## Phase mapping (brief roadmap)

### Phase 1 — Venue marketplace

- [x] Venue discovery / listings / search
- [x] Availability calendar
- [x] Booking requests (+ PayMongo deposit settlement)
- [x] Reviews (verified after complete)
- [~] Interactive calendar richness (seasonal pricing / blackout nuances may be incomplete vs full brief calendar list)

### Phase 2 — Event ecosystem

- [x] Supplier marketplace browse + inquiry/quotes (customer↔supplier path)
- [ ] Full venue↔supplier packaging / dynamic event packages
- [~] Customer messaging (partial / embedded, not full suite)
- [~] Payment automation (PayMongo yes; Maya incomplete)
- [x] Commission management (admin surface exists)

### Phase 3–4 — Planning suite / AI event platform

- [ ] Guest management, RSVP, seating, timeline planners
- [ ] AI Event Planner / Budget Advisor / Supplier Matching / Concierge (beyond current recommendation/search/cost estimator prototypes)

---

## How to update

When a capability ships or is verified:

1. Change `[ ]` / `[~]` → `[x]` (or downgrade if regressing).
2. Adjust the one-line note if the route or product shape changes.
3. Keep [known limitations](../known-limitations.md) in sync for production blockers.
