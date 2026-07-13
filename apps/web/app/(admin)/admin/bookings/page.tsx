import { DashboardPage, DataTable, StatusBadge, EmptyState } from "@/components/dashboard/enterprise";
import { createClient } from "@/lib/supabase/server";
import { requirePermissionOrRedirect } from "@/lib/rbac/admin-context";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Bookings - Admin" };

export default async function AdminBookingsPage() {
  await requirePermissionOrRedirect("marketplace.view");

  const supabase = (await createClient()) as any;
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("id, status, created_at, total_price, start_time, end_time, profiles(full_name), venues(name)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return (
      <DashboardPage>
        <EmptyState icon="error" title="Error loading bookings" description={error.message} />
      </DashboardPage>
    );
  }

  const rows = (bookings ?? []).map((b: any) => ({
    id: b.id,
    customer: b.profiles?.full_name ?? "Unknown",
    venue: b.venues?.name ?? "Unknown",
    price: b.total_price,
    status: b.status,
    date: new Date(b.created_at).toLocaleString(),
  }));

  return (
    <DashboardPage>
      <div className="mb-6">
        <h1 className="text-3xl font-black text-slate-900">Bookings Overview</h1>
        <p className="mt-2 text-slate-500">
          View all marketplace bookings across venues. (Read-only view for monitoring).
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        <DataTable
          rows={rows}
          keyFn={(r) => r.id}
          emptyMessage="No bookings found."
          columns={[
            {
              key: "venue",
              header: "Venue",
              cell: (r: any) => <span className="font-bold text-slate-900">{r.venue}</span>,
            },
            {
              key: "customer",
              header: "Customer",
              cell: (r: any) => r.customer,
            },
            {
              key: "price",
              header: "Total",
              cell: (r: any) => `₱${r.price.toLocaleString()}`,
            },
            {
              key: "date",
              header: "Booked On",
              cell: (r: any) => r.date,
            },
            {
              key: "status",
              header: "Status",
              cell: (r: any) => <StatusBadge status={r.status} />,
            },
          ]}
        />
      </div>
    </DashboardPage>
  );
}
