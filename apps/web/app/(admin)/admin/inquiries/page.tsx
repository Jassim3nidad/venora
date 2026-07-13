import { DashboardPage, DataTable, StatusBadge, EmptyState } from "@/components/dashboard/enterprise";
import { createClient } from "@/lib/supabase/server";
import { requirePermissionOrRedirect } from "@/lib/rbac/admin-context";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inquiries - Admin" };

export default async function AdminInquiriesPage() {
  await requirePermissionOrRedirect("marketplace.view");

  const supabase = (await createClient()) as any;
  const { data: inquiries, error } = await supabase
    .from("supplier_inquiries")
    .select("id, status, created_at, profiles(full_name), supplier_profiles(business_name), event_types")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return (
      <DashboardPage>
        <EmptyState icon="error" title="Error loading inquiries" description={error.message} />
      </DashboardPage>
    );
  }

  const rows = (inquiries ?? []).map((i: any) => ({
    id: i.id,
    customer: i.profiles?.full_name ?? "Unknown",
    supplier: i.supplier_profiles?.business_name ?? "Unknown",
    eventTypes: i.event_types?.join(", ") ?? "None",
    status: i.status,
    date: new Date(i.created_at).toLocaleString(),
  }));

  return (
    <DashboardPage>
      <div className="mb-6">
        <h1 className="text-3xl font-black text-slate-900">Inquiries Overview</h1>
        <p className="mt-2 text-slate-500">
          View all marketplace inquiries between customers and suppliers. (Read-only view).
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        <DataTable
          rows={rows}
          keyFn={(r) => r.id}
          emptyMessage="No inquiries found."
          columns={[
            {
              key: "supplier",
              header: "Supplier",
              cell: (r: any) => <span className="font-bold text-slate-900">{r.supplier}</span>,
            },
            {
              key: "customer",
              header: "Customer",
              cell: (r: any) => r.customer,
            },
            {
              key: "eventTypes",
              header: "Event Types",
              cell: (r: any) => r.eventTypes,
            },
            {
              key: "date",
              header: "Sent On",
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
