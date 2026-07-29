# Fixes — 2026-07-29

Brief partials closed today:

1. Event Coordinator — **Managing venue listings**
2. Accredited Supplier — **Participate in venue packages**
3. Platform Admin — **Disputes (ops extension)**
4. Customer AI — **Package comparison**

---

## 1. Event Coordinator — Managing venue listings

### Summary

Coordinators with `manage_assigned_venue_listings` can edit assigned venue
profiles, media, amenities, and packages. Create/delete venue and venue **base
price** stay owner-only.

### Changes

#### Coordinator venues

- File: `apps/web/app/(venue-owner)/dashboard/coordinator/venues/page.tsx`
- “Edit listing” CTA when `manage_assigned_venue_listings` is granted
- Clear copy: manage assigned listings; create/delete remains with owner
- “Manage packages” links to `/dashboard/packages` when permitted

#### Shared venue edit

- File: `apps/web/app/(venue-owner)/dashboard/venues/[id]/edit/page.tsx`
- Packages unlocked for `manage_assigned_venue_listings` (not only owners)
- Base price still owner-locked (banner updated)
- Back/Cancel → `/dashboard/coordinator/venues` for EC-only users
- Save revalidates coordinator venues + packages
- Fix: preserve `base_price` / `price_unit` when non-owner saves (select those columns)

#### Packages (EC access)

- Files:
  - `apps/web/app/(venue-owner)/dashboard/packages/page.tsx`
  - `apps/web/app/(venue-owner)/dashboard/packages/new/page.tsx`
  - `apps/web/app/(venue-owner)/dashboard/packages/[id]/edit/page.tsx`
  - `apps/web/src/features/venues/application/package-actions.ts`
- Role gate fixed: was checking `"coordinator"` (never matched); now
  `event_coordinator` + `manage_assigned_venue_listings`
- EC Review Venues → coordinator venues list
- Package create/update requires org membership + assignment for coordinators
- Security: org member check now filters by `user_id` (was any active member)

### QA smoke (EC)

1. Sign in as EC with default staff permissions and assigned venues.
2. `/dashboard/coordinator/venues` → **Edit listing**.
3. Change description/media/amenities → save → success.
4. Edit package on listing or `/dashboard/packages` → save.
5. Base price stays disabled; create venue unavailable on EC venues list.

### Out of scope (EC)

- EC create/delete venues
- EC change venue base price

---

## 2. Accredited Supplier — Participate in venue packages

### Summary

Supplier can complete the product path: venue invite → Accept/Decline → active
partnership → commercial agreement → eligible for package builder → see package
inclusions on Partnerships. Eligibility now requires **active partnership +
active agreement** (docs-aligned).

### Changes

#### Owner invite status

- File: `apps/web/src/features/suppliers/application/venue-partnership-actions.ts`
- Owner/EC invite creates `venue_suppliers.status = invited` (was defaulting to
  `application_submitted`, so invites looked like pending applications)
- Does not downgrade already-`active` partnerships
- New `respondToPartnershipInvite` for supplier Accept → `active` / Decline →
  `declined`

#### Supplier invite UI

- Files:
  - `apps/web/src/features/suppliers/ui/PartnershipInviteActions.tsx` (new)
  - `apps/web/app/(supplier)/dashboard/supplier/partnerships/page.tsx`
- Wire Accept / Decline (previously dead buttons)
- New **Package inclusions** section from `package_suppliers`

#### Package eligibility + builder

- File: `apps/web/src/features/venues/application/package-queries.ts`
- `getEligiblePackageSuppliers` requires active `venue_suppliers` **and** active
  agreement
- Files:
  - `.../EligibleSuppliersPanel.tsx`
  - `.../PackageBuilderForm.tsx`
- Preserve previously selected suppliers when editing a package

### Docs

- `docs/design/project-brief-role-checklist.md` — both capabilities `[x]`
- QA canvas `brief-qa-checklist.canvas.tsx` — supplier package participation
  Satisfied

### QA smoke (Supplier packages)

1. VO/EC: Invite accredited supplier as venue partner → supplier sees Invitation.
2. Supplier: Accept invite → Active Partnerships.
3. VO/EC: Propose commercial agreement → supplier accepts.
4. VO/EC: Package builder Add Suppliers shows that supplier → save package.
5. Supplier Partnerships → **Package inclusions** lists the package.
6. Confirm supplier without active partnership does **not** appear in eligibility.

### Out of scope (Supplier)

- Hosted Playwright / full release QA matrix
- Changing commercial agreement proposal UX beyond existing flow

---

## 3. Platform Admin — Disputes (ops extension)

### Summary

Scoped lifecycle already existed. Ops extension now includes optional **https
evidence links**, customer **cancel open case**, admin **case activity** from
audit logs, and account-path revalidation after status updates. File-upload /
malware-scanned attachment suite remains deferred.

### Changes

#### Raise + actions

- Files:
  - `apps/web/src/features/admin-disputes/application/actions.ts`
  - `apps/web/src/features/admin-disputes/ui/RaiseDisputeForm.tsx`
  - `apps/web/src/features/admin-disputes/ui/CancelDisputeButton.tsx` (new)
- Raise accepts up to 3 `https://` evidence URLs → `disputes.evidence_urls`
- Raiser can cancel own **open** dispute (RPC already allowed; app gate fixed)
- Status updates revalidate `/account/disputes`

#### Admin + customer UI

- Files:
  - `apps/web/app/(admin)/admin/disputes/[id]/page.tsx`
  - `apps/web/app/(customer)/account/disputes/page.tsx`
- Evidence links shown on admin case + customer list
- Admin **Case activity** panel (requires `audit_logs.view`)
- Customer cancel control on open cases

#### Docs

- Checklist / known-limitations / coverage-matrix / QA canvas updated
- File uploads explicitly deferred; link evidence counts as ops extension

### QA smoke (Disputes)

1. Customer: raise dispute on eligible booking with 1–2 https links.
2. `/account/disputes` shows links; Cancel open case works.
3. Admin `/admin/disputes/[id]`: evidence links visible; Start review → Resolve with notes.
4. Case activity shows transitions when viewer has `audit_logs.view`.
5. Invalid non-https evidence URL rejected on raise.

### Out of scope (Disputes)

- Storage upload bucket / attachment table / malware scan
- Threaded mid-case notes beyond resolution notes

---

## 4. Customer AI — Package comparison

### Summary

Edge function + compare UI already existed but the picker was orphaned (removed
from venue detail). Remounted under **Available Packages** when a venue has ≥2
active packages. Deterministic comparison table (price, guests, inclusions)
always runs; AI narrative is optional with honest fallback copy.

### Changes

- `apps/web/src/features/venues/ui/VenueDetails.tsx` — mount `PackageComparePicker`
- `apps/web/src/features/venues/ui/PackageComparisonTable.tsx` — disclose when
  `aiSummary` is null
- `apps/web/e2e/qa/marketplace-qa.spec.ts` — clarify fixture has no packages
- Docs: checklist, what-to-fix, `docs/ai.md`, QA canvas

### QA smoke

1. Open a venue with ≥2 active packages.
2. Select 2–4 packages → **Compare Selected**.
3. Confirm comparison table shows price, guest range, inclusion matrix.
4. AI Summary appears when provider/config allow; otherwise fallback message shows.
5. Venue with 0–1 packages: Compare Packages section absent.

### Out of scope

- Cross-venue package compare on `/compare` (venue metadata compare remains
  separate)
- Hosted OpenRouter proof for this path (product path bar; Budget Advisor has
  deeper hosted evidence)
