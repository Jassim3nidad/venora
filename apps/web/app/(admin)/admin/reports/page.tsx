import type { Metadata } from "next";
import {
  DashboardSubPage,
  EmptyState,
  KpiCard,
} from "@/components/dashboard/enterprise";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Reports - Admin" };

export default async function AdminReportsPage() {
  const supabase = (await createClient()) as any;

  const { count: venueCount } = await supabase
    .from("venues")
    .select("id", { count: "exact", head: true });
  const { count: bookingCount } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true });
  const { count: supplierCount } = await supabase
    .from("supplier_profiles")
    .select("id", { count: "exact", head: true });

  return (
    <DashboardSubPage
      title="Reports"
      description="A lightweight Sprint 1 snapshot of marketplace activity."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Venues" value={String(venueCount ?? 0)} icon="location_city" />
        <KpiCard label="Bookings" value={String(bookingCount ?? 0)} icon="event_available" />
        <KpiCard label="Suppliers" value={String(supplierCount ?? 0)} icon="storefront" />
      </div>
      <EmptyState
        icon="assessment"
        title="Detailed reports are not connected yet"
        description="CSV exports and deeper analytics can be added after the core booking and payment flows are stable."
      />
    </DashboardSubPage>
  );
}
