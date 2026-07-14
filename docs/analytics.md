# Analytics and Exports

Venue-owner and authorized admin analytics derive from PostgreSQL booking,
venue, package, customer, payment, and reporting data. No external analytics API
key is used.

Implemented screens/queries cover KPI summaries, revenue, bookings, occupancy,
conversion, customer growth, popular venues/packages, heatmap-style breakdowns,
monthly reports, and CSV/PDF exports where inventory documents show a route.
Exact formulas and time filters are authoritative in the referenced query/RPC
and handler, not marketing labels.

## Access and data behavior

Users must authenticate. Venue owners see data scoped to their owned
organization/venues. Admin exports require the assigned analytics/reporting
permission, not only an admin navigation link. RLS and server checks must agree.
Empty authorized datasets should produce zero/empty states or an empty export,
not fixture data or cross-tenant fallback rows.

Exports can contain business or personal data. Revalidate user/permission and
tenant scope at request time, constrain date range, prevent formula injection in
CSV cells, set private/no-store response behavior where appropriate, and avoid
placing sensitive filters/data in public URLs or logs. Large unbounded queries
can exhaust server memory or time out; aggregation, indexes, range limits, and
streaming/pagination should be reviewed.

## Verification status

Unit/type/build validation covers implementation shape. Authenticated CSV/PDF
export flows remain runtime-unverified where valid dedicated credentials were
unavailable. Do not infer production access or data correctness from a page
render alone. Validate with one owner, another tenant, analyst admin, finance
admin, and unauthorized user in a non-production environment.

For empty/unauthorized/failed exports, follow the
[analytics export runbook](runbooks/23-analytics-export-failure.md) and consult
the [API endpoint inventory](api/endpoint-inventory.md).
