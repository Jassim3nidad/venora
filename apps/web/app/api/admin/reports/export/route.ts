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
import { requirePermission } from "@/lib/rbac/admin-context";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";

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
  const customers =
    customerGrowth[customerGrowth.length - 1]?.totalCustomers ?? 0;

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

/**
 * Platform-wide equivalent of /api/analytics/venue-owner/export — same
 * export builder (features/analytics/application/export.ts), but scoped
 * to {kind:"platform"} and gated by reports.export instead of a venue-owner
 * role check. Every export is logged via log_report_export() (migration
 * 057), which itself re-checks the permission and writes both
 * report_exports and audit_logs rows.
 */
export async function GET(request: NextRequest) {
  const parsed = analyticsExportQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );

  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid report export request.",
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

  try {
    await requirePermission("reports.export");
  } catch (error) {
    if (error instanceof UnauthorizedError)
      return apiError("UNAUTHENTICATED", error.message, 401);
    if (error instanceof ForbiddenError)
      return apiError("FORBIDDEN", error.message, 403);
    throw error;
  }

  const supabase = (await createClient()) as any;
  const scope = { kind: "platform" as const };

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

  await supabase.rpc("log_report_export", {
    p_report_type: "platform_summary",
    p_format: parsed.data.format,
    p_filters: { from: range.from, to: range.to },
    p_row_count: monthlyReports.length,
  });

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
