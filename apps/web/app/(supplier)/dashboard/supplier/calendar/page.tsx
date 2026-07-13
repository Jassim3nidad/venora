import { endOfMonth, format, isValid, startOfMonth } from "date-fns";
import { DashboardSubPage, EmptyState } from "@/components/dashboard/enterprise";
import { getSupplierCalendarMonth } from "@/features/suppliers/application/dashboard-queries";
import { SupplierAvailabilityCalendar } from "@/features/suppliers/ui/SupplierAvailabilityCalendar";
import { getRequiredSupplierDashboardContext } from "../_lib/supplier-dashboard-data";

export const dynamic = "force-dynamic";

export default async function SupplierCalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const query = await searchParams;
  const parsed = new Date(`${query.month ?? format(new Date(), "yyyy-MM")}-01T00:00:00`);
  const date = isValid(parsed) ? parsed : new Date();
  const month = format(date, "yyyy-MM");
  const { supabase, profile } = await getRequiredSupplierDashboardContext();
  if (!profile) return <DashboardSubPage title="Availability" description="Manage the dates your business can accept work."><EmptyState title="Create your supplier profile first" description="Availability belongs to your supplier business profile." /></DashboardSubPage>;
  const data = await getSupplierCalendarMonth(supabase, profile.id, format(startOfMonth(date), "yyyy-MM-dd"), format(endOfMonth(date), "yyyy-MM-dd"));
  return <DashboardSubPage title="Availability" description="Block dates, record closures, and review confirmed jobs."><SupplierAvailabilityCalendar month={month} manual={data.manual} jobs={data.jobs} /></DashboardSubPage>;
}
