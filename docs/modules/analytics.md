# Analytics Module

## 1. Folder Structure

```txt
apps/web/app/(venue-owner)/dashboard/analytics/
  page.tsx
  loading.tsx
apps/web/app/api/analytics/venue-owner/export/
  route.ts
apps/web/src/features/analytics/
  application/queries.ts
  application/export.ts
  schemas/analytics.schema.ts
  ui/AnalyticsExportActions.tsx
  ui/BookingDemandHeatmap.tsx
  ui/BookingsTrendChart.tsx
  ui/CustomerGrowthChart.tsx
  ui/MonthlyReportsTable.tsx
  ui/PopularVenuesTable.tsx
```

## 2. Database Schema

No new tables are required for the current release. Analytics reads existing RLS-protected tables:

```sql
bookings(
  id, venue_id, customer_id, package_id, event_date, status,
  total_amount, created_at
)
venues(
  id, organization_id, name, city, province, avg_rating, review_count, status
)
venue_packages(id, venue_id, name, price)
venue_availability(id, venue_id, date, status)
mv_venue_monthly_stats(venue_id, month, booking_count, revenue, commission, avg_rating, review_count)
```

Accepted revenue metrics use booking statuses `approved`, `confirmed`, and `completed`.

## 3. API Design

`GET /api/analytics/venue-owner/export`

Query:

```ts
{
  format: "csv" | "pdf";
  from?: "YYYY-MM-DD";
  to?: "YYYY-MM-DD";
}
```

Behavior:

- Authenticates with Supabase Auth.
- Authorizes `venue_owner`, `event_coordinator`, or `admin`.
- Scopes data to the user's organization venues, or all venues for admin.
- Returns `text/csv` or `application/pdf` with `Content-Disposition: attachment`.

Errors use `{ data: null, error: { code, message, details? } }`.

Example exports:

```txt
/api/analytics/venue-owner/export?format=csv
/api/analytics/venue-owner/export?format=pdf
/api/analytics/venue-owner/export?format=csv&from=2026-01-01&to=2026-12-31
```

CSV output escapes quotes, commas, and newlines and prefixes spreadsheet-risky
cell values that begin with `=`, `+`, `-`, `@`, tab, or carriage return.

## 4. UI Pages

`/dashboard/analytics` includes:

- Venue performance KPI cards.
- Revenue chart.
- Bookings chart.
- Customer growth chart.
- Booking demand heatmap.
- Popular venues list.
- Popular packages chart.
- Customer demographics charts.
- Monthly reports table.
- CSV/PDF export actions.

## 5. Components

- `CustomerGrowthChart`: cumulative and new customers over time.
- `BookingsTrendChart`: monthly booking count.
- `BookingDemandHeatmap`: month x weekday demand concentration.
- `PopularVenuesTable`: venue rank, bookings, revenue, and rating.
- `MonthlyReportsTable`: revenue, bookings, customers, conversion, average value, and top venue.
- `AnalyticsExportActions`: direct CSV/PDF download links.

## 6. Validation

`analyticsExportQuerySchema` validates export format and ISO date-only strings. It rejects date ranges where `from > to`.

Supported formats are `csv` and `pdf`. Malformed query strings return a
validation response and never produce a file download.

## 7. Error Handling

Page-level analytics queries return empty arrays or null metric objects on Supabase read errors, matching the existing dashboard pattern. Export route handlers return explicit `UNAUTHORIZED`, `FORBIDDEN`, and `VALIDATION_ERROR` responses.

## 8. Loading States

`loading.tsx` renders dashboard header, KPI, chart, and table skeletons while the server page resolves Supabase analytics queries.

## 9. Empty States

The page shows:

- A venue setup empty state when the organization has no venues.
- Chart-local empty states when a metric has no data.
- Table/list empty messages for monthly reports and popular venues.

## 10. Security

- Analytics never uses the service role key.
- All page and export reads use the server Supabase client with the signed-in user session.
- Venue-owner data is scoped by `organization_members` and venue `organization_id`.
- RLS remains the final database enforcement layer.
- Export downloads are marked `private, no-store`.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` must contain only a public anon-role JWT or a Supabase publishable key.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be copied into any `NEXT_PUBLIC_*` variable.
- The browser client, server client, and middleware reject `sb_secret_` values in the public key slot.

Required local environment shape:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<public-anon-or-publishable-key>
SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>
```

Local testing procedure:

1. Retrieve the public anon or publishable key from the Supabase project dashboard.
2. Set it in `apps/web/.env.local` as `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Keep service-role and secret keys only in server-only variables.
4. Run `pnpm type-check`, `pnpm lint`, `pnpm test`, and `pnpm build`.
5. Start the app, sign in as an allowed role, and test CSV/PDF export URLs.

Known limitation: authenticated export smoke tests cannot be completed without a
valid public Supabase key and authorized test accounts for each target role and
organization.

Metric definitions:

- Revenue: sum of `total_amount` for `approved`, `confirmed`, and `completed` bookings.
- Bookings: count of scoped booking rows in the selected range.
- Customer growth: deduplicated customers by their first accepted booking in scope.
- Conversion rate: accepted bookings divided by total booking requests.
- Average booking value: accepted revenue divided by accepted bookings.
- Popular venues: venues ranked by accepted booking count, then revenue.
- Popular packages: packages ranked by accepted booking count.
- Heatmap: accepted bookings grouped by event month and weekday.
- Monthly reports: monthly revenue, booking volume, confirmed bookings, customers, conversion, average value, and top venue.
- Customer demographics: event-type mix and guest-count buckets from booking data.

## 11. Responsive Behavior

The layout is mobile-first:

- KPI cards stack on mobile and expand through tablet/desktop grids.
- Charts use responsive Recharts containers.
- Heatmap and tables allow horizontal scrolling instead of compressing labels.
- Export buttons wrap on narrow screens.

## 12. Future Scalability

Next steps:

- Move all high-volume aggregation to materialized views or RPCs once booking volume grows.
- Add cached report snapshots for monthly close reports.
- Add event/search funnel analytics when venue impression and inquiry tables are introduced.
- Extend the same query helpers to admin and coordinator reports for consistent platform reporting.
