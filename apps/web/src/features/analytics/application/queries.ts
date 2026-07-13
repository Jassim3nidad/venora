/**
 * Shared, scope-parameterized analytics query layer.
 *
 * One implementation per metric, reused by all 5 role dashboards — each
 * caller builds its own `AnalyticsScope` (venue-owner/coordinator use
 * `{kind:"venues"}` via getOwnerVenueIds, supplier uses `{kind:"supplier"}`,
 * admin uses `{kind:"platform"}`, customer uses `{kind:"customer"}`).
 *
 * Every Supabase query is aggregated in JS after a plain select, matching
 * the pattern already used throughout this codebase's analytics pages —
 * no Postgres RPC/date_trunc functions introduced here.
 */

type VenoraSupabase = any;

export type AnalyticsScope =
  | { kind: "venues"; venueIds: string[] }
  | { kind: "supplier"; supplierId: string }
  | { kind: "platform" }
  | { kind: "customer"; customerId: string };

export type DateRange = { from: string; to: string };

export const ACCEPTED_BOOKING_STATUSES = ["approved", "confirmed", "completed"];

// ── Date helpers ────────────────────────────────────────────────────────────

function monthLabel(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-PH", {
    month: "short",
    year: "numeric",
  });
}

function monthKey(value: string | Date): string {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function lastNMonthsRange(months = 12): DateRange {
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth() - (months - 1), 1);
  return { from: toISODate(from), to: toISODate(to) };
}

/** Trailing 30 days through the end of the current month. */
export function getOccupancyWindow(): DateRange {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 30);
  const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { from: toISODate(from), to: toISODate(to) };
}

function daysBetween(from: string, to: string): number {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

function monthBuckets(range: DateRange): { key: string; label: string }[] {
  const from = parseDateOnly(range.from);
  const to = parseDateOnly(range.to);
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  const buckets: { key: string; label: string }[] = [];

  while (cursor <= end) {
    buckets.push({ key: monthKey(cursor), label: monthLabel(cursor) });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return buckets;
}

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

// ── getRevenueTrend ──────────────────────────────────────────────────────────

type RevenueTrendRow = { period: string; revenue: number; bookings: number };

function bucketBookingsByMonth(
  rows: { event_date: string; total_amount: number | null }[],
): RevenueTrendRow[] {
  const buckets = new Map<string, RevenueTrendRow>();
  for (const row of rows) {
    if (!row.event_date) continue;
    const key = monthKey(row.event_date);
    const bucket = buckets.get(key) ?? {
      period: monthLabel(row.event_date),
      revenue: 0,
      bookings: 0,
    };
    bucket.revenue += Number(row.total_amount) || 0;
    bucket.bookings += 1;
    buckets.set(key, bucket);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([, value]) => value);
}

export async function getRevenueTrend(
  supabase: VenoraSupabase,
  scope: AnalyticsScope,
  range: DateRange = lastNMonthsRange(),
): Promise<RevenueTrendRow[]> {
  if (scope.kind === "platform") {
    const { data, error } = await supabase
      .from("mv_venue_monthly_stats")
      .select("month, revenue, booking_count")
      .gte("month", range.from)
      .lte("month", range.to)
      .order("month", { ascending: true });

    if (!error && data && data.length > 0) {
      const buckets = new Map<string, RevenueTrendRow>();
      for (const row of data as {
        month: string;
        revenue: number | null;
        booking_count: number | null;
      }[]) {
        const key = monthKey(row.month);
        const bucket = buckets.get(key) ?? {
          period: monthLabel(row.month),
          revenue: 0,
          bookings: 0,
        };
        bucket.revenue += Number(row.revenue) || 0;
        bucket.bookings += Number(row.booking_count) || 0;
        buckets.set(key, bucket);
      }
      return [...buckets.entries()]
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([, value]) => value);
    }
    // mv_venue_monthly_stats is empty (e.g. dev DB, pg_cron hasn't refreshed yet) — fall back below.
  }

  if (scope.kind === "supplier") {
    const { data, error } = await supabase
      .from("booking_suppliers")
      .select("agreed_price, bookings(event_date)")
      .eq("supplier_id", scope.supplierId)
      .eq("status", "confirmed");

    if (error || !data) return [];

    const rows = (
      data as {
        agreed_price: number | null;
        bookings: { event_date: string } | { event_date: string }[] | null;
      }[]
    )
      .map((row) => {
        const booking = Array.isArray(row.bookings)
          ? row.bookings[0]
          : row.bookings;
        return booking
          ? { event_date: booking.event_date, total_amount: row.agreed_price }
          : null;
      })
      .filter(
        (row): row is { event_date: string; total_amount: number | null } =>
          row !== null,
      );

    return bucketBookingsByMonth(rows);
  }

  if (scope.kind === "customer") {
    const { data, error } = await supabase
      .from("bookings")
      .select("event_date, total_amount")
      .eq("customer_id", scope.customerId)
      .in("status", ACCEPTED_BOOKING_STATUSES)
      .gte("event_date", range.from)
      .lte("event_date", range.to);

    if (error || !data) return [];
    return bucketBookingsByMonth(data);
  }

  // "venues" scope, or "platform" scope falling back from an empty materialized view.
  let query = supabase
    .from("bookings")
    .select("event_date, total_amount")
    .in("status", ACCEPTED_BOOKING_STATUSES)
    .gte("event_date", range.from)
    .lte("event_date", range.to);

  if (scope.kind === "venues") {
    if (scope.venueIds.length === 0) return [];
    query = query.in("venue_id", scope.venueIds);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return bucketBookingsByMonth(data);
}

// ── getOccupancyRate ─────────────────────────────────────────────────────────

export type OccupancyResult = {
  rate: number;
  reservedDays: number;
  totalDays: number;
};

/** Only meaningful for `venues`/`platform` scope — null for supplier/customer. */
export async function getOccupancyRate(
  supabase: VenoraSupabase,
  scope: AnalyticsScope,
  range: DateRange = getOccupancyWindow(),
): Promise<OccupancyResult | null> {
  if (scope.kind === "supplier" || scope.kind === "customer") return null;

  let venueIds: string[];
  if (scope.kind === "venues") {
    if (scope.venueIds.length === 0)
      return { rate: 0, reservedDays: 0, totalDays: 0 };
    venueIds = scope.venueIds;
  } else {
    const { data: venues } = await supabase.from("venues").select("id");
    venueIds = (venues ?? []).map((venue: { id: string }) => venue.id);
    if (venueIds.length === 0)
      return { rate: 0, reservedDays: 0, totalDays: 0 };
  }

  const totalDays = venueIds.length * daysBetween(range.from, range.to);

  const { count } = await supabase
    .from("venue_availability")
    .select("id", { count: "exact", head: true })
    .in("venue_id", venueIds)
    .gte("date", range.from)
    .lte("date", range.to)
    .eq("status", "reserved");

  const reservedDays = count ?? 0;
  const rate =
    totalDays > 0 ? Number(((reservedDays / totalDays) * 100).toFixed(1)) : 0;

  return { rate, reservedDays, totalDays };
}

// ── getConversionRate ────────────────────────────────────────────────────────

export type ConversionResult = {
  rate: number;
  converted: number;
  total: number;
};

/** Formula differs by role. Not applicable for `customer` scope (null). */
export async function getConversionRate(
  supabase: VenoraSupabase,
  scope: AnalyticsScope,
  range: DateRange = lastNMonthsRange(),
): Promise<ConversionResult | null> {
  if (scope.kind === "customer") return null;

  if (scope.kind === "supplier") {
    const [{ count: confirmed }, { count: cancelled }] = await Promise.all([
      supabase
        .from("booking_suppliers")
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", scope.supplierId)
        .eq("status", "confirmed"),
      supabase
        .from("booking_suppliers")
        .select("id", { count: "exact", head: true })
        .eq("supplier_id", scope.supplierId)
        .eq("status", "cancelled"),
    ]);

    const converted = confirmed ?? 0;
    const total = converted + (cancelled ?? 0);
    return {
      rate: total > 0 ? Number(((converted / total) * 100).toFixed(1)) : 0,
      converted,
      total,
    };
  }

  // "venues" or "platform" scope: of all booking requests received, what fraction progressed.
  let totalQuery = supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .gte("created_at", range.from)
    .lte("created_at", range.to);
  let convertedQuery = supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .in("status", ACCEPTED_BOOKING_STATUSES)
    .gte("created_at", range.from)
    .lte("created_at", range.to);

  if (scope.kind === "venues") {
    if (scope.venueIds.length === 0) return { rate: 0, converted: 0, total: 0 };
    totalQuery = totalQuery.in("venue_id", scope.venueIds);
    convertedQuery = convertedQuery.in("venue_id", scope.venueIds);
  }

  const [{ count: total }, { count: converted }] = await Promise.all([
    totalQuery,
    convertedQuery,
  ]);
  const totalCount = total ?? 0;
  const convertedCount = converted ?? 0;

  return {
    rate:
      totalCount > 0
        ? Number(((convertedCount / totalCount) * 100).toFixed(1))
        : 0,
    converted: convertedCount,
    total: totalCount,
  };
}

// ── getTopPackages ───────────────────────────────────────────────────────────

export type TopPackageResult = { label: string; value: number; meta?: string };

function aggregateTopItems<T>(
  rows: T[],
  labelFn: (row: T) => string,
  limit: number,
): TopPackageResult[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const label = labelFn(row);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export async function getTopPackages(
  supabase: VenoraSupabase,
  scope: AnalyticsScope,
  range: DateRange = lastNMonthsRange(),
  limit = 5,
): Promise<TopPackageResult[]> {
  if (scope.kind === "supplier") {
    const { data, error } = await supabase
      .from("booking_suppliers")
      .select("service_id, supplier_services(name)")
      .eq("supplier_id", scope.supplierId)
      .eq("status", "confirmed")
      .not("service_id", "is", null);

    if (error || !data) return [];
    return aggregateTopItems(
      data as {
        supplier_services: { name: string } | { name: string }[] | null;
      }[],
      (row) => {
        const service = Array.isArray(row.supplier_services)
          ? row.supplier_services[0]
          : row.supplier_services;
        return service?.name ?? "Unnamed service";
      },
      limit,
    );
  }

  if (scope.kind === "customer") {
    const { data, error } = await supabase
      .from("bookings")
      .select("venue_id, event_date, venues(name)")
      .eq("customer_id", scope.customerId)
      .order("event_date", { ascending: false });

    if (error || !data) return [];

    const results = new Map<string, TopPackageResult>();
    for (const row of data as {
      event_date: string;
      venues: { name: string } | { name: string }[] | null;
    }[]) {
      const venue = Array.isArray(row.venues) ? row.venues[0] : row.venues;
      const label = venue?.name ?? "Unknown venue";
      const existing = results.get(label) ?? {
        label,
        value: 0,
        meta: row.event_date,
      };
      existing.value += 1;
      if (row.event_date > (existing.meta ?? ""))
        existing.meta = row.event_date;
      results.set(label, existing);
    }
    return [...results.values()]
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
  }

  // "venues" or "platform" scope
  let query = supabase
    .from("bookings")
    .select("package_id, venue_packages(name)")
    .in("status", ACCEPTED_BOOKING_STATUSES)
    .not("package_id", "is", null)
    .gte("event_date", range.from)
    .lte("event_date", range.to);

  if (scope.kind === "venues") {
    if (scope.venueIds.length === 0) return [];
    query = query.in("venue_id", scope.venueIds);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return aggregateTopItems(
    data as { venue_packages: { name: string } | { name: string }[] | null }[],
    (row) => {
      const pkg = Array.isArray(row.venue_packages)
        ? row.venue_packages[0]
        : row.venue_packages;
      return pkg?.name ?? "Unnamed package";
    },
    limit,
  );
}

// ── getBookingDemographics ───────────────────────────────────────────────────

export type BookingDemographics = {
  eventTypeMix: { status: string; count: number }[];
  guestCountBuckets: { bucket: string; count: number }[];
  newVsReturning?: { new: number; returning: number };
};

const GUEST_COUNT_BUCKETS = [
  { label: "1-50", max: 50 },
  { label: "51-100", max: 100 },
  { label: "101-200", max: 200 },
  { label: "201-500", max: 500 },
  { label: "500+", max: Infinity },
] as const;

function bucketGuestCount(count: number): string {
  for (const bucket of GUEST_COUNT_BUCKETS) {
    if (count <= bucket.max) return bucket.label;
  }
  return "500+";
}

type DemographicsRow = {
  guest_count: number | null;
  event_type_name: string | null;
  customer_id: string;
};

type BookingDemographicsRelationRow = {
  guest_count: number | null;
  customer_id: string;
  event_types: { name: string } | { name: string }[] | null;
};

function emptyDemographics(): BookingDemographics {
  return {
    eventTypeMix: [],
    guestCountBuckets: GUEST_COUNT_BUCKETS.map((bucket) => ({
      bucket: bucket.label,
      count: 0,
    })),
  };
}

/** Not applicable for `customer` scope (null) — no age/gender/location data exists anywhere. */
export async function getBookingDemographics(
  supabase: VenoraSupabase,
  scope: AnalyticsScope,
  range: DateRange = lastNMonthsRange(),
): Promise<BookingDemographics | null> {
  if (scope.kind === "customer") return null;

  let rows: DemographicsRow[];

  if (scope.kind === "supplier") {
    const { data, error } = await supabase
      .from("booking_suppliers")
      .select("bookings(guest_count, customer_id, event_types(name))")
      .eq("supplier_id", scope.supplierId)
      .eq("status", "confirmed");

    if (error || !data) return emptyDemographics();

    rows = (
      data as {
        bookings:
          | BookingDemographicsRelationRow
          | BookingDemographicsRelationRow[]
          | null;
      }[]
    )
      .map((row) =>
        Array.isArray(row.bookings) ? row.bookings[0] : row.bookings,
      )
      .filter((booking): booking is BookingDemographicsRelationRow =>
        Boolean(booking),
      )
      .map((booking) => {
        const eventType = Array.isArray(booking.event_types)
          ? booking.event_types[0]
          : booking.event_types;
        return {
          guest_count: booking.guest_count,
          event_type_name: eventType?.name ?? null,
          customer_id: booking.customer_id,
        };
      });
  } else {
    let query = supabase
      .from("bookings")
      .select("guest_count, customer_id, event_date, event_types(name)")
      .in("status", ACCEPTED_BOOKING_STATUSES)
      .gte("event_date", range.from)
      .lte("event_date", range.to);

    if (scope.kind === "venues") {
      if (scope.venueIds.length === 0) return emptyDemographics();
      query = query.in("venue_id", scope.venueIds);
    }

    const { data, error } = await query;
    if (error || !data) return emptyDemographics();

    rows = (data as BookingDemographicsRelationRow[]).map((row) => {
      const eventType = Array.isArray(row.event_types)
        ? row.event_types[0]
        : row.event_types;
      return {
        guest_count: row.guest_count,
        event_type_name: eventType?.name ?? null,
        customer_id: row.customer_id,
      };
    });
  }

  const eventTypeCounts = new Map<string, number>();
  for (const row of rows) {
    const label = row.event_type_name ?? "Unspecified";
    eventTypeCounts.set(label, (eventTypeCounts.get(label) ?? 0) + 1);
  }
  const eventTypeMix = [...eventTypeCounts.entries()].map(
    ([status, count]) => ({ status, count }),
  );

  const guestBucketCounts = new Map<string, number>(
    GUEST_COUNT_BUCKETS.map((bucket) => [bucket.label, 0]),
  );
  for (const row of rows) {
    const bucket = bucketGuestCount(row.guest_count ?? 0);
    guestBucketCounts.set(bucket, (guestBucketCounts.get(bucket) ?? 0) + 1);
  }
  const guestCountBuckets = GUEST_COUNT_BUCKETS.map((bucket) => ({
    bucket: bucket.label,
    count: guestBucketCounts.get(bucket.label) ?? 0,
  }));

  let newVsReturning: { new: number; returning: number } | undefined;
  if (scope.kind === "venues" || scope.kind === "platform") {
    const customerIds = [...new Set(rows.map((row) => row.customer_id))];
    if (customerIds.length > 0) {
      let priorQuery = supabase
        .from("bookings")
        .select("customer_id")
        .in("customer_id", customerIds)
        .in("status", ACCEPTED_BOOKING_STATUSES)
        .lt("event_date", range.from);

      if (scope.kind === "venues")
        priorQuery = priorQuery.in("venue_id", scope.venueIds);

      const { data: priorData } = await priorQuery;
      const returningIds = new Set(
        (priorData ?? []).map(
          (row: { customer_id: string }) => row.customer_id,
        ),
      );
      const returning = customerIds.filter((id) => returningIds.has(id)).length;
      newVsReturning = { new: customerIds.length - returning, returning };
    }
  }

  return {
    eventTypeMix,
    guestCountBuckets,
    ...(newVsReturning ? { newVsReturning } : {}),
  };
}

// ── getCommissionTrend ───────────────────────────────────────────────────────

/**
 * Platform-only — commissions/payouts have no other scope concept in this
 * app, so this deliberately takes no `AnalyticsScope` param. Feeds the same
 * RevenueTrendChart component as getRevenueTrend, but with commission
 * amounts instead of gross booking revenue (a distinct call site).
 */
export async function getCommissionTrend(
  supabase: VenoraSupabase,
  range: DateRange = lastNMonthsRange(),
): Promise<RevenueTrendRow[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("created_at, commission_amount")
    .eq("status", "paid")
    .gte("created_at", range.from)
    .lte("created_at", range.to);

  if (error || !data) return [];

  const buckets = new Map<string, RevenueTrendRow>();
  for (const row of data as {
    created_at: string;
    commission_amount: number | null;
  }[]) {
    const key = monthKey(row.created_at);
    const bucket = buckets.get(key) ?? {
      period: monthLabel(row.created_at),
      revenue: 0,
      bookings: 0,
    };
    bucket.revenue += Number(row.commission_amount) || 0;
    bucket.bookings += 1;
    buckets.set(key, bucket);
  }
  return [...buckets.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([, value]) => value);
}

// --- Venue performance analytics ------------------------------------------

type AnalyticsVenueDetails = {
  id: string;
  name: string | null;
  city: string | null;
  province: string | null;
  avg_rating: number | null;
  review_count: number | null;
};

type ScopedBookingAnalyticsRow = {
  id: string;
  event_date: string;
  created_at: string | null;
  status: string;
  total_amount: number | null;
  customer_id: string | null;
  venue_id: string | null;
  venue: AnalyticsVenueDetails | null;
};

type BookingAnalyticsQueryRow = Omit<ScopedBookingAnalyticsRow, "venue"> & {
  venues: AnalyticsVenueDetails | AnalyticsVenueDetails[] | null;
};

type SupplierBookingAnalyticsQueryRow = {
  status: string | null;
  agreed_price: number | null;
  bookings: BookingAnalyticsQueryRow | BookingAnalyticsQueryRow[] | null;
};

function isAcceptedBooking(status: string | null | undefined) {
  return !!status && ACCEPTED_BOOKING_STATUSES.includes(status);
}

function normalizeBookingRow(
  row: BookingAnalyticsQueryRow,
): ScopedBookingAnalyticsRow {
  return {
    id: row.id,
    event_date: row.event_date,
    created_at: row.created_at,
    status: row.status,
    total_amount: row.total_amount,
    customer_id: row.customer_id,
    venue_id: row.venue_id,
    venue: one(row.venues),
  };
}

async function getScopedBookingAnalyticsRows(
  supabase: VenoraSupabase,
  scope: AnalyticsScope,
  range: DateRange,
  options: { includeBeforeRange?: boolean } = {},
): Promise<ScopedBookingAnalyticsRow[]> {
  const from = options.includeBeforeRange ? "1900-01-01" : range.from;

  if (scope.kind === "supplier") {
    const { data, error } = await supabase
      .from("booking_suppliers")
      .select(
        "status, agreed_price, bookings(id, event_date, created_at, status, total_amount, customer_id, venue_id, venues(id, name, city, province, avg_rating, review_count))",
      )
      .eq("supplier_id", scope.supplierId);

    if (error || !data) return [];

    return (data as SupplierBookingAnalyticsQueryRow[])
      .map((row) => {
        const booking = one(row.bookings);
        if (!booking) return null;
        return {
          ...normalizeBookingRow(booking),
          status: row.status ?? booking.status,
          total_amount: row.agreed_price ?? booking.total_amount,
        };
      })
      .filter((row): row is ScopedBookingAnalyticsRow => {
        return !!row && row.event_date >= from && row.event_date <= range.to;
      });
  }

  let query = supabase
    .from("bookings")
    .select(
      "id, event_date, created_at, status, total_amount, customer_id, venue_id, venues(id, name, city, province, avg_rating, review_count)",
    )
    .gte("event_date", from)
    .lte("event_date", range.to);

  if (scope.kind === "venues") {
    if (scope.venueIds.length === 0) return [];
    query = query.in("venue_id", scope.venueIds);
  }

  if (scope.kind === "customer") {
    query = query.eq("customer_id", scope.customerId);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as BookingAnalyticsQueryRow[]).map(normalizeBookingRow);
}

export type CustomerGrowthPoint = {
  period: string;
  newCustomers: number;
  totalCustomers: number;
};

export async function getCustomerGrowth(
  supabase: VenoraSupabase,
  scope: AnalyticsScope,
  range: DateRange = lastNMonthsRange(),
): Promise<CustomerGrowthPoint[]> {
  if (scope.kind === "customer") return [];

  const buckets = monthBuckets(range);
  if (buckets.length === 0) return [];

  const rows = await getScopedBookingAnalyticsRows(supabase, scope, range, {
    includeBeforeRange: true,
  });
  const firstBookingByCustomer = new Map<string, string>();

  for (const row of rows) {
    if (!row.customer_id || !isAcceptedBooking(row.status)) continue;
    const existing = firstBookingByCustomer.get(row.customer_id);
    if (!existing || row.event_date < existing) {
      firstBookingByCustomer.set(row.customer_id, row.event_date);
    }
  }

  const firstBookingMonths = [...firstBookingByCustomer.values()].map(monthKey);
  const firstBucketKey = buckets[0]?.key;
  if (!firstBucketKey) return [];
  let runningTotal = firstBookingMonths.filter(
    (key) => key < firstBucketKey,
  ).length;

  return buckets.map((bucket) => {
    const newCustomers = firstBookingMonths.filter(
      (key) => key === bucket.key,
    ).length;
    runningTotal += newCustomers;
    return {
      period: bucket.label,
      newCustomers,
      totalCustomers: runningTotal,
    };
  });
}

export type PopularVenueResult = {
  id: string;
  label: string;
  city: string;
  bookings: number;
  revenue: number;
  rating: number;
  reviews: number;
  value: number;
  meta: string;
};

export async function getPopularVenues(
  supabase: VenoraSupabase,
  scope: AnalyticsScope,
  range: DateRange = lastNMonthsRange(),
  limit = 5,
): Promise<PopularVenueResult[]> {
  const rows = await getScopedBookingAnalyticsRows(supabase, scope, range);
  const acceptedRows = rows.filter((row) => isAcceptedBooking(row.status));
  const venues = new Map<string, PopularVenueResult>();

  for (const row of acceptedRows) {
    if (!row.venue_id) continue;

    const venue = row.venue;
    const existing =
      venues.get(row.venue_id) ??
      ({
        id: row.venue_id,
        label: venue?.name ?? "Unknown venue",
        city:
          [venue?.city, venue?.province].filter(Boolean).join(", ") ||
          "Location not set",
        bookings: 0,
        revenue: 0,
        rating: Number(venue?.avg_rating) || 0,
        reviews: Number(venue?.review_count) || 0,
        value: 0,
        meta: "",
      } satisfies PopularVenueResult);

    existing.bookings += 1;
    existing.revenue += Number(row.total_amount) || 0;
    existing.value = existing.bookings;
    existing.meta = `${existing.bookings} bookings`;
    venues.set(row.venue_id, existing);
  }

  return [...venues.values()]
    .sort((a, b) => b.bookings - a.bookings || b.revenue - a.revenue)
    .slice(0, limit);
}

export type BookingHeatmapPoint = {
  month: string;
  day: string;
  count: number;
  intensity: number;
};

const WEEKDAY_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

export async function getBookingDemandHeatmap(
  supabase: VenoraSupabase,
  scope: AnalyticsScope,
  range: DateRange = lastNMonthsRange(),
): Promise<BookingHeatmapPoint[]> {
  const buckets = monthBuckets(range);
  const rows = (
    await getScopedBookingAnalyticsRows(supabase, scope, range)
  ).filter((row) => isAcceptedBooking(row.status));
  const counts = new Map<string, number>();

  for (const row of rows) {
    const date = parseDateOnly(row.event_date);
    const key = `${monthKey(date)}:${date.getDay()}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const max = Math.max(1, ...counts.values());

  return buckets.flatMap((bucket) =>
    WEEKDAY_LABELS.map((day, dayIndex) => {
      const count = counts.get(`${bucket.key}:${dayIndex}`) ?? 0;
      return {
        month: bucket.label,
        day,
        count,
        intensity: count / max,
      };
    }),
  );
}

export type MonthlyReportRow = {
  period: string;
  revenue: number;
  bookings: number;
  confirmedBookings: number;
  customers: number;
  conversionRate: number;
  averageBookingValue: number;
  topVenue: string;
};

type MonthlyReportBucket = {
  period: string;
  revenue: number;
  bookings: number;
  confirmedBookings: number;
  customers: Set<string>;
  venueBookings: Map<string, number>;
};

export async function getMonthlyReports(
  supabase: VenoraSupabase,
  scope: AnalyticsScope,
  range: DateRange = lastNMonthsRange(),
): Promise<MonthlyReportRow[]> {
  const buckets = new Map<string, MonthlyReportBucket>(
    monthBuckets(range).map((bucket) => [
      bucket.key,
      {
        period: bucket.label,
        revenue: 0,
        bookings: 0,
        confirmedBookings: 0,
        customers: new Set<string>(),
        venueBookings: new Map<string, number>(),
      },
    ]),
  );

  const rows = await getScopedBookingAnalyticsRows(supabase, scope, range);

  for (const row of rows) {
    const bucket = buckets.get(monthKey(row.event_date));
    if (!bucket) continue;

    bucket.bookings += 1;
    if (row.customer_id) bucket.customers.add(row.customer_id);

    const venueName = row.venue?.name ?? "Unknown venue";
    bucket.venueBookings.set(
      venueName,
      (bucket.venueBookings.get(venueName) ?? 0) + 1,
    );

    if (isAcceptedBooking(row.status)) {
      bucket.confirmedBookings += 1;
      bucket.revenue += Number(row.total_amount) || 0;
    }
  }

  return [...buckets.values()].map((bucket) => {
    const topVenue =
      [...bucket.venueBookings.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
      "-";

    return {
      period: bucket.period,
      revenue: bucket.revenue,
      bookings: bucket.bookings,
      confirmedBookings: bucket.confirmedBookings,
      customers: bucket.customers.size,
      conversionRate:
        bucket.bookings > 0
          ? Number(
              ((bucket.confirmedBookings / bucket.bookings) * 100).toFixed(1),
            )
          : 0,
      averageBookingValue:
        bucket.confirmedBookings > 0
          ? Math.round(bucket.revenue / bucket.confirmedBookings)
          : 0,
      topVenue,
    };
  });
}
