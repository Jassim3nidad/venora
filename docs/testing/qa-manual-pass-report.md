# Venora Manual QA Pass Report

**Date:** 2026-07-20  
**Scope:** Full user-facing functionality checklist (sections A–M)  
**App:** `apps/web`  
**Tester notes:** Manual browser QA against local/dev environment

---

## Summary

| Status | Count |
|--------|------:|
| Pass | 148 |
| Fail | 4 |
| Checking (open) | 8 |
| Elaborate / note | 2 |
| **Total items** | **162** |

### Failures (must fix or retest)

| ID | Area | Issue |
|----|------|--------|
| C4 | Auth | Forgot password flow failed |
| C5 | Auth | Reset password flow failed |
| K1 | AI | NL venue search failed |
| E17 | Venue security | Unauthorized page should show `/unauthorized`, but redirects to `/login` instead |

### Open / still checking

| ID | Area | Notes |
|----|------|--------|
| A7 | Cross-cutting | Responsive layout still checking |
| E11 | Venue owner | Staff invite/manage still checking |
| E12 | Venue owner | `/staff/accept` invitation flow still checking |
| E18 | Venue owner | Supplier dashboard denial still checking |
| H2.1 | Admin | Finance admin allow/deny matrix still checking |
| H3.1 | Admin | Analyst admin allow/deny matrix still checking |
| H4.1 | Admin | Support admin permission matrix still checking |

### Pass-with-notes (UX / product)

| ID | Area | Notes |
|----|------|--------|
| E7 | Venue owner | Booking messages pass, but overlapped text on card |
| G8 | Supplier | Calendar label updated to **Calendar** (FIX-011 in `docs/testing/Venora_QA_Bug_Report.md`) |
| E17 | Venue owner | Denial works, but lands on `/login` instead of `/unauthorized` (and does not route back to venue dashboard) |

---

## Status legend

| Mark | Meaning |
|------|---------|
| Pass | Behavior matches expected |
| Fail | Behavior broken or incorrect |
| Checking | Not finished / inconclusive |
| N/A | Out of scope for this run |
| Note | Pass or Fail with extra detail |

---

## A. Global / Cross-cutting

| ID | Functionality | Status | Notes |
|----|---------------|--------|-------|
| A1 | Route protection (logged-out → `/login`) | Pass | |
| A2 | Wrong role → `/unauthorized` | Pass | See E17 conflict for venue-owner case |
| A3 | Post-login role redirect | Pass | |
| A4 | Logout clears session | Pass | |
| A5 | Redirect aliases | Pass | |
| A6 | Cross-tenant isolation | Pass | |
| A7 | Responsive layout | Checking | |
| A8 | Accessibility smoke (`/`, `/venues`, `/login`) | Pass | |
| A9 | `/429` rate-limit page | Pass | |

---

## B. Public / Marketing (no login)

| ID | Route / action | Status | Notes |
|----|----------------|--------|-------|
| B1 | `/` landing + hero search | Pass | |
| B2 | `/venues` browse / filter / pagination | Pass | |
| B3 | `/venues/[slug]` detail | Pass | |
| B4 | `/venues/[slug]/book` requires login | Pass | |
| B5 | `/suppliers` browse + filters | Pass | |
| B6 | `/suppliers/[slug]` detail | Pass | |
| B7 | Favorite (anon) → login prompt | Pass | |
| B8 | `/features` | Pass | |
| B9 | `/pricing` | Pass | |
| B10 | `/about` | Pass | |
| B11 | `/careers` | Pass | |
| B12 | `/newsroom` | Pass | |
| B13 | `/hosting-resources` | Pass | |
| B14 | `/host-protection` | Pass | |
| B15 | `/safety` | Pass | |
| B16 | `/cancellation-options` | Pass | |
| B17 | `/privacy` | Pass | |
| B18 | `/terms` | Pass | |
| B19 | `/help` | Pass | |

---

## C. Authentication

| ID | Flow | Status | Notes |
|----|------|--------|-------|
| C1 | Register | Pass | |
| C2 | Email verification | Pass | |
| C3 | Login | Pass | |
| C4 | Forgot password (`/forgot-password`) | **Fail** | Needs investigation (email send, confirmation UI, enumeration messaging) |
| C5 | Reset password (`/reset-password`) | **Fail** | Likely blocked by C4 or recovery session/token handling |
| C6 | Logout | Pass | |
| C7 | Deep-link protection + return | Pass | |
| C8 | Suspended account blocked | Pass | |
| C9 | Pending partner application restrictions | Pass | |

### C4 / C5 investigation checklist

1. Submit email on `/forgot-password` — does UI show success without leaking account existence?
2. Does Supabase Auth send the recovery email in this environment?
3. Does the email link land on `/reset-password` with a valid recovery session?
4. Can a new password be set and used to log in?
5. Expired/invalid token error handling

---

## D. Customer

### D1. Profile & account

| ID | Route / action | Status | Notes |
|----|----------------|--------|-------|
| D1.1 | `/profile/setup` | Pass | |
| D1.2 | `/account` | Pass | |
| D1.3 | `/account/dashboard` | Pass | |
| D1.4 | `/account/personal-details` | Pass | |
| D1.5 | `/account/change-password` | Pass | |
| D1.6 | `/account/privacy` (Coming soon UI) | Pass | Placeholder expected |
| D1.7 | `/settings` notification prefs | Pass | |
| D1.8 | `/account/become-partner` | Pass | |
| D1.9 | Delete account | Pass | |

### D2. Marketplace (logged in)

| ID | Action | Status | Notes |
|----|--------|--------|-------|
| D2.1 | Favorite venue add/remove | Pass | |
| D2.2 | `/favorites` list | Pass | |
| D2.3 | Favorite supplier | Pass | |
| D2.4 | Supplier inquiry submit | Pass | |

### D3. Booking lifecycle

| ID | Route / action | Status | Notes |
|----|----------------|--------|-------|
| D3.1 | Booking inquiry submit | Pass | |
| D3.2 | `/bookings` list + filters | Pass | |
| D3.3 | `/bookings/[id]` detail | Pass | |
| D3.4 | Venue approve → `approved` | Pass | |
| D3.5 | Start PayMongo checkout | Pass | |
| D3.6 | Webhook → `confirmed` | Pass | |
| D3.7 | Confirmation page | Pass | |
| D3.8 | Cancel booking | Pass | |
| D3.9 | Submit review + photos | Pass | |

### D4. Payments & inquiries

| ID | Route | Status | Notes |
|----|-------|--------|-------|
| D4.1 | `/account/payments` | Pass | |
| D4.2 | `/account/transactions` | Pass | |
| D4.3 | `/inquiries/[id]` quotes | Pass | |

### D5. Notifications

| ID | Action | Status | Notes |
|----|--------|--------|-------|
| D5.1 | Notification bell | Pass | |
| D5.2 | Mark read on click | Pass | |
| D5.3 | `/notifications` inbox | Pass | |
| D5.4 | Push subscribe/unsubscribe | Pass | |

### D6. Customer negative tests

| ID | Action | Status | Notes |
|----|--------|--------|-------|
| D6.1 | Visit `/admin/*` | Pass | Denied |
| D6.2 | Visit `/dashboard/venue-owner` | Pass | Denied |
| D6.3 | Visit `/dashboard/supplier` | Pass | Denied |
| D6.4 | Admin API export denial | Elaborate | See below |

#### D6.4 — Elaborate: Admin report export denial

**What to test**

As a **customer** (or any non-admin role), call the admin report export endpoint:

```http
GET /api/admin/reports/export
```

(Optionally with query params used by the admin reports UI.)

**Expected**

| Check | Expected result |
|-------|-----------------|
| HTTP status | `401` (unauthenticated) or `403` (authenticated but missing `reports.export` / admin permission) |
| Body | Error payload only — no CSV/report data |
| Side effects | No file download; no audit “export success” for this user |
| UI | Customer has no nav link to admin reports/export |

**How to verify quickly**

1. Log in as customer.
2. Open browser DevTools → Network.
3. Visit or `fetch('/api/admin/reports/export')` from the console while on the app origin.
4. Confirm status is **401/403**, not **200** with CSV.
5. Optionally repeat as venue owner / supplier — same denial.

**Pass criteria:** Non-admin never receives export content.  
**Fail criteria:** `200` + downloadable report, or silent data leak.

---

## E. Venue Owner

| ID | Route / action | Status | Notes |
|----|----------------|--------|-------|
| E1 | `/dashboard` overview | Pass | |
| E2 | `/dashboard/venues` list | Pass | |
| E3 | Create venue | Pass | |
| E4 | Edit/delete venue | Pass | |
| E5 | `/dashboard/bookings` | Pass | |
| E6 | Approve / decline booking | Pass | |
| E7 | Booking message thread | Pass | **UX:** overlapped text on card |
| E8 | Mark booking complete | Pass | |
| E9 | `/dashboard/calendar` availability | Pass | |
| E10 | `/dashboard/packages` | Pass | |
| E11 | `/dashboard/staff` invite/manage | Checking | |
| E12 | `/staff/accept?token=…` | Checking | |
| E13 | `/dashboard/reviews` + reply | Pass | |
| E14 | Analytics + export | Pass | |
| E15 | AI venue description | Pass | |
| E16 | AI package comparison | Pass | |
| E17 | Deny `/admin/*` | Pass (bug) | Shows `/login` instead of `/unauthorized`; does not return to venue dashboard |
| E18 | Deny `/dashboard/supplier` | Checking | |
| E19 | Cross-tenant booking isolation | Pass | |

### E17 — Unauthorized routing bug (detail)

**Observed**

- Venue owner visits an unauthorized page (e.g. admin).
- App redirects to **`/login`** rather than **`/unauthorized`**.
- After denial, user is not routed back to the venue owner dashboard.

**Expected (per checklist A2 / E17)**

- Authenticated wrong-role user → `/unauthorized`.
- Unauthenticated user → `/login` (with optional `redirectTo`).
- Authenticated venue owner after denial should remain able to navigate back to `/dashboard` without a forced re-login UX.

**Suggested retest**

1. Stay logged in as venue owner.
2. Hit `/admin`, `/dashboard/supplier`, `/admin/users`.
3. Confirm path is `/unauthorized` (not `/login`).
4. Use recovery/home/dashboard links from unauthorized page → land on venue dashboard.

---

## F. Event Coordinator

| ID | Route | Status | Notes |
|----|-------|--------|-------|
| F1 | `/dashboard/coordinator` | Pass | |
| F2 | Events list | Pass | |
| F3 | Event detail | Pass | |
| F4 | Coordinator calendar | Pass | |
| F5 | Venues discovery | Pass | |
| F6 | Suppliers discovery | Pass | |
| F7 | Reports | Pass | |
| F8 | Shared venue tools | Pass | |

---

## G. Supplier

| ID | Route / action | Status | Notes |
|----|----------------|--------|-------|
| G1 | Supplier overview | Pass | |
| G2 | Business profile | Pass | |
| G3 | Services CRUD | Pass | |
| G4 | Inquiries list | Pass | |
| G5 | Inquiry detail + messages | Pass | |
| G6 | Quotes list | Pass | |
| G7 | Quote draft / send / withdraw | Pass | |
| G8 | Supplier calendar | Pass | Label fixed to **Calendar** (FIX-011) |
| G9 | Portfolio list | Pass | |
| G10 | Portfolio create | Pass | |
| G11 | Portfolio edit | Pass | |
| G12 | Reviews | Pass | |
| G13 | Bookings / jobs | Pass | |
| G14 | Analytics | Pass | |
| G15 | Deny `/admin/*` | Pass | |
| G16 | Deny `/dashboard/venue-owner` | Pass | |

### G8 — Copy fix

| Location | Previous | Expected / Current |
|----------|----------|--------------------|
| Supplier calendar nav / page title | Availability | Calendar (fixed — FIX-011) |

---

## H. Admin

### H1. Super admin

| ID | Route / action | Status | Notes |
|----|----------------|--------|-------|
| H1.1 | `/admin` overview | Pass | |
| H1.2 | Partner applications | Pass | |
| H1.3 | Users list | Pass | |
| H1.4 | Suspend / reactivate user | Pass | |
| H1.5 | Venues review list | Pass | |
| H1.6 | Approve / reject / suspend venue | Pass | |
| H1.7 | Suppliers list | Pass | |
| H1.8 | Approve / reject / suspend supplier | Pass | |
| H1.9 | Platform bookings | Pass | |
| H1.10 | Inquiries monitor | Pass | |
| H1.11 | Review moderation | Pass | |
| H1.12 | Marketplace flags | Pass | |
| H1.13 | Reports | Pass | |
| H1.14 | Reports export | Pass | |
| H1.15 | Disputes | Pass | Workflow may still be partial by design |
| H1.16 | Commissions | Pass | |
| H1.17 | AI configuration (no secrets) | Pass | |
| H1.18 | System settings | Pass | |
| H1.19 | Administrators | Pass | |
| H1.20 | Audit logs | Pass | |
| H1.21 | Self-demotion guard | Pass | |

### H2–H4. Tier matrices (open)

| ID | Tier | Status | Notes |
|----|------|--------|-------|
| H2.1 | Finance admin allow/deny | Checking | Can: Overview, Commissions, Reports, Audit. Cannot: Users, Venues, Suppliers, Applications, Marketplace, AI, Settings, Administrators |
| H3.1 | Analyst admin allow/deny | Checking | Can: Overview, Reports, Audit. Cannot: Commissions + management modules |
| H4.1 | Support admin permissions | Checking | Verify against `permissions.ts` / nav gating |

---

## I. Payments (PayMongo)

| ID | Action | Status | Notes |
|----|--------|--------|-------|
| I1 | Start checkout → `payment_pending` | Pass | |
| I2 | Success return URL | Pass | |
| I3 | Webhook → `confirmed` | Pass | |
| I4 | Refund request | Pass | |
| I5 | Receipt / invoice visibility | Pass | |
| I6 | Maya webhook | Pass | Marked pass in this run; still treat as non-prod-ready per product docs if retesting |

---

## J. Notifications

| ID | Channel / action | Status | Notes |
|----|------------------|--------|-------|
| J1 | In-app bell + inbox | Pass | |
| J2 | Mark read / mark all | Pass | |
| J3 | Email triggers | Pass | |
| J4 | Web push | Pass | |
| J5 | Preferences persist | Pass | |

---

## K. AI features

| ID | Feature | Status | Notes |
|----|---------|--------|-------|
| K1 | NL venue search | **Fail** | Landing/marketplace natural-language search broken or not returning ranked results |
| K2 | Venue recommendations | Pass | |
| K3 | Cost estimator | Pass | |
| K4 | Package comparison | Pass | |
| K5 | Venue description generation | Pass | |
| K6 | Customer assistant | Pass | |
| K7 | Admin AI config | Pass | |

### K1 investigation checklist

1. Enter a natural-language query on landing / search.
2. Confirm request to AI search edge function / API succeeds (Network tab).
3. Confirm ranked venue results render (not empty / error toast / fallback-only).
4. Check env: AI keys, feature flags in `/admin/ai-configuration`, Supabase edge function deploy.

---

## L. File uploads

| ID | Bucket / use case | Status | Notes |
|----|-------------------|--------|-------|
| L1 | Avatars | Pass | |
| L2 | Venue images | Pass | |
| L3 | Verification docs | Pass | |
| L4 | Review photos | Pass | |

---

## M. Booking state machine branches

| ID | Branch | Status | Notes |
|----|--------|--------|-------|
| M1 | Venue declines → `declined` | Pass | |
| M2 | Customer cancels → `cancelled` | Pass | |
| M3 | Booking expires → `expired` | Pass | |

---

## Defect backlog (from this pass)

| Priority | ID | Title | Type |
|----------|----|-------|------|
| P0 | C4 | Forgot password flow fails | Functional |
| P0 | C5 | Reset password flow fails | Functional |
| P1 | K1 | NL venue search fails | Functional / AI |
| P1 | E17 | Wrong-role denial shows `/login` instead of `/unauthorized` | Auth / routing |
| P2 | E7 | Overlapped text on venue booking message card | UI |
| P2 | G8 | Supplier nav/title “Availability” → “Calendar” | Copy — **Fixed (FIX-011)** |
| — | A7, E11, E12, E18, H2.1, H3.1, H4.1 | Still checking | Open |

---

## Recommended next actions

1. **Retest C4 → C5** as one recovery path (forgot email → link → reset → login).
2. **Fix / retest E17** unauthorized routing for authenticated wrong-role users.
3. **Debug K1** NL search (network + AI config + edge function).
4. Finish open items: **A7, E11, E12, E18, H2–H4**.
5. File / fix P2 UX ticket for **E7** overlapped text (G8 Calendar label done — FIX-011).
6. Complete **D6.4** with Network-tab proof of `401/403` on `/api/admin/reports/export`.
7. Retest **FIX-010** filter accordion on `/venues`.

---

## Appendix — full result dump (raw)

```
A1-A6 Pass | A7 Checking | A8-A9 Pass
B1-B19 Pass
C1-C3 Pass | C4 Fail | C5 Fail | C6-C9 Pass
D1.* Pass | D2.* Pass | D3.* Pass | D4.* Pass | D5.* Pass
D6.1-D6.3 Pass | D6.4 Elaborate
E1-E10 Pass | E7 note: overlapped text | E11-E12 Checking
E13-E16 Pass | E17 Pass but login not unauthorized | E18 Checking | E19 Pass
F1-F8 Pass
G1-G16 Pass | G8 fixed: Calendar label (FIX-011)
H1.* Pass | H2.1/H3.1/H4.1 Checking
I1-I6 Pass
J1-J5 Pass
K1 Fail | K2-K7 Pass
L1-L4 Pass
M1-M3 Pass
```

---

*Generated from the 2026-07-20 manual QA checklist results.*
