# Supplier Marketplace

## Folder Structure

- `app/(customer)/suppliers/page.tsx` - public supplier marketplace route.
- `app/(customer)/suppliers/[slug]/page.tsx` - public supplier profile route.
- `app/api/suppliers/route.ts` - supplier list API with filters and pagination.
- `app/api/suppliers/[id]/route.ts` - supplier detail API by id or slug.
- `app/api/suppliers/[id]/contact/route.ts` - authenticated contact request API.
- `app/(supplier)/dashboard/supplier/*` - supplier overview, profile, services, portfolio, and inquiries dashboard.
- `src/features/suppliers/application` - server actions and Supabase query mapping.
- `src/features/suppliers/schemas` - Zod validation for search, profile, packages, portfolio, and contact requests.
- `src/features/suppliers/ui` - marketplace, profile, contact, and dashboard management components.
- `src/features/suppliers/types` - strongly typed supplier marketplace contracts.
- `src/features/suppliers/utils` - display formatting and supplier derivation helpers.

## Database Schema

Migration: `supabase/migrations/023_supplier_marketplace.sql`

- Extends `supplier_profiles` with slug, headline, service areas, contact fields, media URLs, response time, team metadata, featured status, and public marketplace fields.
- Extends `supplier_services` into package-ready records with package type, inclusions, guest ranges, active flag, sort order, and `updated_at`.
- Adds `supplier_portfolio_items` for public work samples.
- Adds `supplier_contact_requests` for customer-to-supplier inquiry workflow.
- Adds indexes for slug lookup, featured marketplace sorting, service areas, active services, portfolio ordering, and inquiry dashboards.
- Adds RLS for public accredited reads, supplier-owner management, customer contact creation, and admin override.

## API Design

- `GET /api/suppliers`
  - Query: `q`, `category`, `location`, `minPrice`, `maxPrice`, `minRating`, `sort`, `page`, `limit`.
  - Response: paginated suppliers plus categories.
- `GET /api/suppliers/[id]`
  - Accepts UUID or slug.
  - Response: supplier profile with category, packages, portfolio, and reviews.
- `POST /api/suppliers/[id]/contact`
  - Requires signed-in user.
  - Body: contact name/email/phone, service ID, event date, location, guest count, message.
  - Writes to `supplier_contact_requests` only for accredited suppliers.

## UI Pages And Components

- `/suppliers` includes search, category filter, location filter, max price, minimum rating, sort, result count, loading-ready empty state, and responsive cards.
- `/suppliers/[slug]` includes image hero, accreditation, profile summary, packages/pricing, portfolio gallery, reviews, contact information, and inquiry form.
- `/dashboard/supplier/profile` manages public profile metadata and contact information.
- `/dashboard/supplier/services` manages package pricing, inclusions, active/archive state, and guest ranges.
- `/dashboard/supplier/portfolio` manages portfolio work samples.
- `/dashboard/supplier/inquiries` lists direct marketplace inquiries.

## Validation And Errors

- Client dashboard forms use React Hook Form with Zod resolvers.
- Server actions and route handlers re-run Zod validation before writes.
- API responses use `{ success, data }` or `{ success, error }`.
- Missing auth returns `AUTH_REQUIRED`; malformed input returns `VALIDATION_ERROR`; missing supplier returns `NOT_FOUND`; failed writes return feature-specific errors.

## Loading, Empty, And Responsive States

- The public marketplace ships with sample suppliers as a development fallback when live Supabase rows are absent.
- Empty search results show a clear reset action.
- Dashboard pages guard package/portfolio/inquiry views until a supplier profile exists.
- Layouts are mobile-first: single-column filters/cards on mobile, sticky filter/sidebar panels on desktop, fixed card media ratios, and non-overlapping text regions.

## Security Considerations

- Public supplier reads are restricted to `accreditation_status = 'accredited'`.
- Supplier profile, package, and portfolio mutations require supplier ownership via RLS.
- Contact requests require an authenticated customer and an accredited supplier destination.
- Admins retain full override through existing `public.is_admin()` policies.
- Server actions avoid trusting hidden UI state; owner/supplier IDs are resolved server-side.

## Future Scalability

- Replace image URL fields with Supabase Storage upload widgets and moderation states.
- Add Postgres full-text search or pgvector supplier embeddings for AI recommendations.
- Add supplier availability calendars and quote workflows.
- Add supplier favorites and comparison lists.
- Add admin accreditation queues for profile, portfolio, and package review.
- Add background notifications from `supplier_contact_requests` to email, SMS, and in-app channels.
