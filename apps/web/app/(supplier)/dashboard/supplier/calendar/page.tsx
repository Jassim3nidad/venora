import { endOfMonth, format, isValid, startOfMonth } from "date-fns";
import {
  DashboardSubPage,
  EmptyState,
} from "@/components/dashboard/enterprise";
import { getSupplierCalendarMonth } from "@/features/suppliers/application/dashboard-queries";
import { SupplierAvailabilityCalendar } from "@/features/suppliers/ui/SupplierAvailabilityCalendar";
import { getRequiredSupplierDashboardContext } from "../_lib/supplier-dashboard-data";

export const dynamic = "force-dynamic";

export default async function SupplierCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const query = await searchParams;
  const requestedMonth = /^\d{4}-\d{2}$/.test(query.month ?? "")
    ? query.month
    : format(new Date(), "yyyy-MM");
  const parsed = new Date(`${requestedMonth}-01T00:00:00`);
  const date = isValid(parsed) ? parsed : new Date();
  const month = format(date, "yyyy-MM");
  const { supabase, profile } = await getRequiredSupplierDashboardContext();
  if (!profile)
    return (
      <DashboardSubPage
        title="Calendar"
        description="Manage the dates your business can accept work."
      >
        <EmptyState
          title="Create your supplier profile first"
          description="Calendar dates belong to your supplier business profile."
        />
      </DashboardSubPage>
    );
  let data: Awaited<ReturnType<typeof getSupplierCalendarMonth>>;
  try {
    data = await getSupplierCalendarMonth(
      supabase,
      profile.id,
      format(startOfMonth(date), "yyyy-MM-dd"),
      format(endOfMonth(date), "yyyy-MM-dd"),
    );
  } catch (error) {
    console.error("[supplier/calendar] Availability fetch failed:", error);
    return (
      <DashboardSubPage
        title="Calendar"
        description="Manage the dates your business can accept work."
      >
        <EmptyState
          icon="error"
          title="Could not load calendar"
          description="Refresh the page or try another month. Your existing records were not changed."
        />
      </DashboardSubPage>
    );
  }
  return (
    <DashboardSubPage
      title="Calendar"
      description="Control which dates customers can request. Confirmed supplier jobs are shown automatically."
    >
      <SupplierAvailabilityCalendar
        month={month}
        manual={data.manual}
        jobs={data.jobs}
      />
    </DashboardSubPage>
  );
}
