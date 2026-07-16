import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { analyticsExportQuerySchema } from "@/features/analytics/schemas/analytics.schema";
import {
  getCustomerGrowth,
  getMonthlyReports,
  getPopularVenues,
  lastNMonthsRange,
  type CustomerGrowthPoint,
  type DateRange,
} from "@/features/analytics/application/queries";
import {
  analyticsExportFilename,
  buildAnalyticsCsv,
  buildAnalyticsPdf,
  type AnalyticsExportData,
} from "@/features/analytics/application/export";
import { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type ExportContext = {
  venueIds: string[];
  roles: string[];
};

function apiError(
  code: string,
  message: string,
  status: number,
  details?: unknown,
) {
  return NextResponse.json(
    { data: null, error: { code, message, details } },
    { status },
  );
}

async function getExportContext(
  supabase: SupabaseServerClient,
  userId: string,
): Promise<ExportContext> {
  const [{ data: roleRows }, { data: memberRows }, { data: ownedRows }] =
    await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", userId)
        .eq("status", "active"),
      supabase.from("organizations").select("id").eq("owner_id", userId),
    ]);

  const roles = (roleRows ?? []).map((row: { role: string }) => row.role);
  const orgIds = Array.from(
    new Set<string>([
      ...(memberRows ?? []).map(
        (row: { organization_id: string }) => row.organization_id,
      ),
      ...(ownedRows ?? []).map((row: { id: string }) => row.id),
    ]),
  );

  if (orgIds.length === 0) return { roles, venueIds: [] };

  const { data: venues } = await supabase
    .from("venues")
    .select("id")
    .in("organization_id", orgIds);

  return {
    roles,
    venueIds: (venues ?? []).map((venue: { id: string }) => venue.id),
  };
}

function resolveRange(queryRange: {
  from?: string | undefined;
  to?: string | undefined;
}): DateRange {
  const fallback = lastNMonthsRange(12);
  return {
    from: queryRange.from ?? fallback.from,
    to: queryRange.to ?? fallback.to,
  };
}

function buildSummary(
  monthlyReports: AnalyticsExportData["monthlyReports"],
  customerGrowth: CustomerGrowthPoint[],
) {
  const totalRevenue = monthlyReports.reduce(
    (sum, row) => sum + row.revenue,
    0,
  );
  const totalBookings = monthlyReports.reduce(
    (sum, row) => sum + row.bookings,
    0,
  );
  const confirmedBookings = monthlyReports.reduce(
    (sum, row) => sum + row.confirmedBookings,
    0,
  );
  const latestCustomerGrowth = customerGrowth[customerGrowth.length - 1];
  const customers = latestCustomerGrowth?.totalCustomers ?? 0;

  return {
    totalRevenue,
    totalBookings,
    confirmedBookings,
    customers,
    conversionRate:
      totalBookings > 0
        ? Number(((confirmedBookings / totalBookings) * 100).toFixed(1))
        : 0,
  };
}

export async function GET(request: NextRequest) {
  const parsed = analyticsExportQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid analytics export request.",
      400,
      parsed.error.flatten(),
    );
  }

  const range = resolveRange(parsed.data);
  if (range.from > range.to) {
    return apiError(
      "VALIDATION_ERROR",
      "The export start date must be before the end date.",
      400,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    return apiError("UNAUTHORIZED", "Please sign in to export analytics.", 401);

  const context = await getExportContext(supabase, user.id);
  const allowed =
    context.roles.includes("venue_owner") ||
    context.roles.includes("event_coordinator") ||
    context.roles.includes("admin");

  if (!allowed) {
    return apiError(
      "FORBIDDEN",
      "You do not have permission to export venue analytics.",
      403,
    );
  }

  const scope = { kind: "venues" as const, venueIds: context.venueIds };
  const [monthlyReports, popularVenues, customerGrowth] = await Promise.all([
    getMonthlyReports(supabase, scope, range),
    getPopularVenues(supabase, scope, range),
    getCustomerGrowth(supabase, scope, range),
  ]);
  const exportData: AnalyticsExportData = {
    generatedAt: new Date().toISOString(),
    range,
    summary: buildSummary(monthlyReports, customerGrowth),
    monthlyReports,
    popularVenues,
  };
  const filename = analyticsExportFilename(parsed.data.format);

  if (parsed.data.format === "pdf") {
    return new NextResponse(buildAnalyticsPdf(exportData), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  return new NextResponse(buildAnalyticsCsv(exportData), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
