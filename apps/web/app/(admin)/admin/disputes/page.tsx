import {
  DashboardPage,
  DataTable,
  StatusBadge,
  EmptyState,
} from "@/components/dashboard/enterprise";
import { createClient } from "@/lib/supabase/server";
import { requirePermissionOrRedirect } from "@/lib/rbac/admin-context";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Disputes - Admin" };

export default async function AdminDisputesPage() {
  await requirePermissionOrRedirect("reports.view");

  const supabase = (await createClient()) as any;
  const { data: disputes, error } = await supabase
    .from("disputes")
    .select(
      "id, status, created_at, reason, profiles(full_name), venues(name), bookings(id)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <DashboardPage>
        <EmptyState
          icon="error"
          title="Error loading disputes"
          description={error.message}
        />
      </DashboardPage>
    );
  }

  const rows = (disputes ?? []).map((d: any) => ({
    id: d.id,
    customer: d.profiles?.full_name ?? "Unknown",
    venue: d.venues?.name ?? "Unknown",
    reason: d.reason,
    status: d.status,
    date: new Date(d.created_at).toLocaleString(),
  }));

  return (
    <DashboardPage>
      <div className="mb-6">
        <h1 className="text-3xl font-black text-slate-900">
          Disputes Overview
        </h1>
        <p className="mt-2 text-slate-500">
          Review booking, payment, and marketplace disputes that require
          administrator follow-up.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        <DataTable
          rows={rows}
          keyFn={(r) => r.id}
          emptyMessage="No disputes found."
          columns={[
            {
              key: "venue",
              header: "Venue",
              cell: (r: any) => (
                <span className="font-bold text-slate-900">{r.venue}</span>
              ),
            },
            {
              key: "customer",
              header: "Raised By",
              cell: (r: any) => r.customer,
            },
            {
              key: "reason",
              header: "Reason",
              cell: (r: any) =>
                r.reason.slice(0, 50) + (r.reason.length > 50 ? "..." : ""),
            },
            {
              key: "date",
              header: "Created On",
              cell: (r: any) => r.date,
            },
            {
              key: "status",
              header: "Status",
              cell: (r: any) => <StatusBadge status={r.status} />,
            },
            {
              key: "actions",
              header: "",
              cell: (r: any) => (
                <Link
                  href={`/admin/disputes/${r.id}`}
                  className="text-brand-600 hover:underline"
                >
                  View Details
                </Link>
              ),
            },
          ]}
        />
      </div>
    </DashboardPage>
  );
}
