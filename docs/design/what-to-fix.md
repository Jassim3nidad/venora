# What to fix — prioritized rundown

Actionable backlog of gaps vs the Project Brief and known product/engineering
issues. Use alongside:

- [Project Brief role checklist](project-brief-role-checklist.md)
- [Known limitations](../known-limitations.md)
- [UX remediation backlog](ux-remediation-backlog.md)

**Priority key**

| Priority | Meaning |
| -------- | ------- |
| P0 | Blocks trust / wrong role access / production risk |
| P1 | Brief “must have” still missing or badly partial |
| P2 | Important polish, Phase 2 ecosystem, or ops depth |
| P3 | Nice-to-have / later roadmap |

Status: `[ ]` open · `[~]` in progress / partial · `[x]` done

---

## P0 — Fix first (integrity & trust)

### Role routing & access

- [ ] **EC booking “View” links** — Events table still may deep-link into
  venue-owner `/dashboard/bookings/...` and hit unauthorized. Mirror calendar
  fix: coordinator-owned booking detail routes (or shared pages under EC shell).
- [ ] **Org membership for coordinators** — Finish staff invite / accept so EC
  role + org attach works without manual/SQL setup
  (`/dashboard/staff`, `/staff/accept`).
- [ ] **Venue card identity** — Card ID/name/slug/detail/favorite must agree
  (UX-02 / known limitations). Prevents wrong venue booked or favorited.

### Marketplace data honesty

- [ ] **Supplier fallback inventory** — Empty/error states must not look like
  real suppliers customers can contact (UX-03).
- [ ] **Authenticated QA matrix** — Run customer / owner / supplier / EC / admin
  fixtures; many paths are source-only, not runtime-verified.

### Payments / security (production)

- [ ] Keep **Maya disabled** until full adapter + reconciliation exists.
- [ ] Confirm hosted **RLS / Storage / Edge** state before release.
- [ ] Address **API rate limiting** and Storage ownership/validation gaps as
  listed in known limitations.

---

## P1 — Brief gaps that block “role contents satisfied”

### Event Coordinator (largest role gap)

- [ ] Scope or ship **EC MVP**: event detail, coordination actions, messaging,
  notifications, settings (UX-12).
- [ ] **Communicate with customers** as a first-class flow (not only partial
  booking conversation).
- [ ] Clarify product rule in UI: EC is **org staff**, not customer-hired
  (avoid become-partner copy overselling “manage clients”).

### Venue Owner

- [ ] Complete **staff invite + permissions** end-to-end (brief: Manage staff).

### Supplier ↔ Venue (Phase 2, but brief already lists it)

- [ ] **Venues associate accredited suppliers** with listings (product UI for
  `venue_suppliers` or equivalent).
- [ ] **Attach suppliers to a booking** (`booking_suppliers`) — jobs path
  currently schema/Phase 2 without finished attach UI.

### Customer

- [ ] **Compare venues** — side-by-side or structured compare (brief capability;
  today = favorites only).

### Administrator

- [ ] **Dedicated payment / refund monitoring** workspace (brief: Payment
  monitoring).
- [ ] **Disputes** — replace placeholder with scoped case management or hide
  until ready (UX-13).

---

## P2 — Product depth & ecosystem

### Calendar richness (brief § Interactive Venue Calendar)

- [ ] Confirm/cover: tentative reservations, maintenance, seasonal pricing,
  blackout dates — beyond basic available/reserved.

### Messaging & notifications

- [ ] Unified **customer messaging** suite (Phase 2).
- [ ] Dedicated notification/settings routes for owner / supplier / EC where
  missing.

### Payments

- [ ] Finish or permanently park **Maya**.
- [ ] Customer **invoice / receipt / refund IA** easier to find (UX-15).

### Analytics

- [ ] EC **booking performance** beyond overview/reports list.
- [ ] Admin marketplace-wide analytics completeness vs brief.

### UX / a11y (from remediation backlog)

- [ ] Dead Help control → wire `/help` (UX-04).
- [ ] Mobile drawer focus/Escape (UX-06).
- [ ] Supplier crop dialog accessibility (UX-25).
- [ ] Shared branded 404 / error recovery (UX-10 / UX-11).
- [ ] Landmark / heading structure cleanup (UX-05/08/09).

---

## P3 — Later roadmap (brief Phase 3–4)

Do **not** block Phase 1 release on these unless product explicitly expands scope.

- [ ] Guest management / RSVP / seating / event timeline
- [ ] AI Event Planner / Budget Advisor / Supplier Matching / Concierge
- [ ] Featured placements, sponsored listings, premium subscriptions
- [ ] Stripe (future payments)

---

## Suggested fix order (next 4–6 sprints)

| Order | Item | Why |
| ----: | ---- | --- |
| 1 | Venue identity + supplier fallback honesty | Stops wrong bookings / fake inventory |
| 2 | EC booking routes + org invite | Makes coordinator role usable as brief describes |
| 3 | Staff invite completion (VO) | Unblocks EC attachment |
| 4 | Payment monitor + disputes decision | Admin brief + ops trust |
| 5 | Venue↔supplier associate / booking attach | Brief supplier “participate in packages” |
| 6 | Venue compare + calendar richness | Customer brief polish |
| 7 | Messaging / notifications / a11y P2 | Ecosystem quality |

---

## Already fixed recently (do not re-open)

Keep for regression only:

- [x] EC calendar under `/dashboard/coordinator/calendar` (not VO shell)
- [x] Sticky multi-open marketplace filters; View Results mobile-only
- [x] Duplicate supplier “Recommended” sort removed
- [x] Auth popup for Bookings / Favorites / Host a Venue + favorite hearts

---

## How to use this file

1. Pick the next open `[ ]` from **P0**, then **P1**.
2. When done, mark `[x]` here and update
   [project-brief-role-checklist.md](project-brief-role-checklist.md).
3. Log production blockers in [known-limitations.md](../known-limitations.md).
4. Prefer small PRs: one integrity fix or one role gap per PR.
