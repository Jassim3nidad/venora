# Unified Owner Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/dashboard/business-profile` publish into the customer-facing `/owners/[slug]` page.

**Architecture:** Extend the existing public owner RPC result with sanitized published business profile snapshot fields, then normalize and render those fields in the existing owner profile page. Keep `/owners/[slug]` canonical and redirect `/partners/[slug]` to the matching owner route.

**Tech Stack:** Next.js App Router, React Server Components, Supabase RPC, Postgres migrations, Vitest, Tailwind.

## Global Constraints

- Use existing `business_profiles` and `business_profile_publications` tables.
- Do not expose draft business profile rows to public users.
- Do not expose `legal_name`, `private_address`, hidden email, or hidden phone.
- Do not change auth, RBAC, middleware, booking, supplier, or payment logic.
- Do not modify `package.json` or lockfiles.
- Use `font-bold`, not `font-black`, in new customer-facing UI.

---

### Task 1: Owner Profile Normalization Tests

**Files:**

- Create: `apps/web/src/features/owners/application/queries.test.ts`
- Modify: `apps/web/src/features/owners/application/queries.ts`

**Interfaces:**

- Produces: `normalizeProfile(row: any): PublicOwnerProfile | null` exported for tests.
- Produces: `PublicOwnerProfile` fields for published profile data.

- [ ] **Step 1: Write failing tests**

Create `apps/web/src/features/owners/application/queries.test.ts` with tests proving published business fields map into `PublicOwnerProfile` and private fields are ignored by absence.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @venora/web test -- src/features/owners/application/queries.test.ts`

Expected: fail because `normalizeProfile` is not exported or profile fields are missing.

- [ ] **Step 3: Implement minimal normalization**

Add optional public fields to `PublicOwnerProfile` and map matching RPC columns in `normalizeProfile`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @venora/web test -- src/features/owners/application/queries.test.ts`

Expected: pass.

### Task 2: Public Owner RPC Migration

**Files:**

- Create: new Supabase migration from `supabase migration new unify_owner_profile_publication_fields`
- Modify generated migration SQL.

**Interfaces:**

- Extends `public.get_public_owner_profile(p_slug text)`.
- Extends `public.get_public_owner_profile_by_venue(p_venue_slug text)` by reusing `get_public_owner_profile`.

- [ ] **Step 1: Create migration**

Run: `supabase migration new unify_owner_profile_publication_fields`.

- [ ] **Step 2: Add RPC fields**

Update `get_public_owner_profile` return columns with sanitized snapshot values:

`display_name`, `tagline`, `short_description`, `about`, `year_established`, `logo_path`, `cover_image_path`, `city`, `province`, `country_code`, `public_email`, `public_phone`, `website_url`, `verification_status`.

- [ ] **Step 3: Preserve grants**

Keep `REVOKE ALL ... FROM PUBLIC` and `GRANT EXECUTE ... TO anon, authenticated`.

- [ ] **Step 4: Type fallback**

Do not require generated database types to be updated in this task because owner RPC calls already use `any`.

### Task 3: Owner Page UI Fields

**Files:**

- Modify: `apps/web/app/(customer)/owners/[slug]/page.tsx`

**Interfaces:**

- Consumes: expanded `PublicOwnerProfile`.
- Uses existing owner venue/review queries unchanged.

- [ ] **Step 1: Render logo/cover**

Use `owner.logoPath` for avatar image and `owner.coverImagePath` for a compact cover band when available; keep initials and current layout fallback.

- [ ] **Step 2: Render profile copy**

Use `owner.tagline`, `owner.shortDescription`, and `owner.about` before generated copy. Keep generated copy only as fallback.

- [ ] **Step 3: Render profile details**

Add compact profile signals for established year, visible location, email, phone, and website. Hide missing fields.

- [ ] **Step 4: Keep layout stable**

Keep the existing max-width, section rhythm, venue cards, and review cards. Avoid nested cards, decorative gradients, and oversized hero styling.

### Task 4: Dashboard Links And Publishing

**Files:**

- Modify: `apps/web/src/features/business-profiles/ui/BusinessProfileEditor.tsx`
- Modify: `apps/web/app/(venue-owner)/dashboard/business-profile/preview/page.tsx`
- Modify: `apps/web/src/features/business-profiles/application/actions.ts`

**Interfaces:**

- Dashboard preview and published links point to `/owners/[slug]`.
- Publishing revalidates owner and legacy partner paths.

- [ ] **Step 1: Update URL text**

Change `venora.ph/partners/` labels to `venora.ph/owners/`.

- [ ] **Step 2: Update links**

Change preview and editor links from `/partners/${slug}` to `/owners/${slug}`.

- [ ] **Step 3: Update revalidation**

Add `revalidatePath("/dashboard/business-profile/preview")` and `revalidatePath(`/owners/${draft.slug}`)` while preserving legacy `/partners/${draft.slug}`.

### Task 5: Legacy Partner Redirect

**Files:**

- Modify: `apps/web/app/(customer)/partners/[slug]/page.tsx`

**Interfaces:**

- Uses `redirect("/owners/[slug]")` when a published profile exists.
- Returns `notFound()` when no published profile exists.

- [ ] **Step 1: Replace render with redirect**

Keep metadata safe, but page body redirects to owner route after resolving the published profile slug.

### Task 6: Verification

**Files:**

- No source files unless verification reveals a bug.

- [ ] **Step 1: Run focused tests**

Run:

`pnpm --filter @venora/web test -- src/features/owners/application/queries.test.ts src/lib/is-marketplace-route.test.ts`

- [ ] **Step 2: Run type-check**

Run:

`pnpm --filter @venora/web type-check`

- [ ] **Step 3: Check conflict markers**

Run:

`git grep -n -E "^(<<<<<<<|=======|>>>>>>>)"`

- [ ] **Step 4: Browser check**

Open `/dashboard/business-profile` and `/owners/venora-research-venue-network` at desktop, tablet, and mobile widths. Confirm published fields appear on owner profile without exposing private fields.
