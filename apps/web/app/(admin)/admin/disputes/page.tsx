import type { Metadata } from "next";
import Link from "next/link";
import {
  DashboardSubPage,
  DataTable,
  EmptyState,
  KpiCard,
  Panel,
  PanelHeader,
  StatusBadge,
  type DataTableColumn,
} from "@/components/dashboard/enterprise";
import { createClient } from "@/lib/supabase/server";
import { requirePermissionOrRedirect } from "@/lib/rbac/admin-context";

export const metadata: Metadata = { title: "Disputes - Admin" };
export const dynamic = "force-dynamic";

type DisputeStatusFilter =
  | "all"
  | "open"
  | "under_review"
  | "resolved"
  | "rejected"
  | "cancelled";

type DisputeRow = {
  id: string;
  customer: string;
  venue: string;
  category: string;
  reason: string;
  status: string;
  date: string;
};

const STATUS_OPTIONS: { value: DisputeStatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "under_review", label: "Under review" },
  { value: "resolved", label: "Resolved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function prettyCategory(value: string) {
  return value.replace(/_/g, " ");
}

type Props = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminDisputesPage({ searchParams }: Props) {
  await requirePermissionOrRedirect("disputes.view");

  const params = await searchParams;
  const status = (
    STATUS_OPTIONS.some((o) => o.value === params.status)
      ? params.status
      : "all"
  ) as DisputeStatusFilter;

  const supabase = (await createClient()) as any;

  let listQuery = supabase
    .from("disputes")
    .select(
      "id, status, category, created_at, reason, profiles!raised_by(full_name), venues(name)",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (status !== "all") {
    listQuery = listQuery.eq("status", status);
  }

  const [
    { data: disputes, error },
    { count: openCount },
    { count: reviewCount },
    { count: resolvedCount },
  ] = await Promise.all([
    listQuery,
    supabase
      .from("disputes")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    supabase
      .from("disputes")
      .select("id", { count: "exact", head: true })
      .eq("status", "under_review"),
    supabase
      .from("disputes")
      .select("id", { count: "exact", head: true })
      .eq("status", "resolved"),
  ]);

  if (error) {
    return (
      <DashboardSubPage title="Disputes" description="Case management workspace.">
        <EmptyState
          icon="error"
          title="Error loading disputes"
          description={error.message}
        />
      </DashboardSubPage>
    );
  }

  const rows: DisputeRow[] = (disputes ?? []).map((d: any) => {
    const profile = asOne(d.profiles);
    const venue = asOne(d.venues);
    return {
      id: d.id,
      customer: profile?.full_name ?? "Unknown",
      venue: venue?.name ?? "Unknown",
      category: d.category,
      reason: d.reason ?? "",
      status: d.status,
      date: new Date(d.created_at).toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    };
  });

  const columns: DataTableColumn<DisputeRow>[] = [
    {
      key: "venue",
      header: "Venue",
      cell: (r) => (
        <div>
          <p className="font-bold text-[#0f172a]">{r.venue}</p>
          <p className="text-xs font-semibold capitalize text-[#64748b]">
            {prettyCategory(r.category)}
          </p>
        </div>
      ),
    },
    { key: "customer", header: "Raised by", cell: (r) => r.customer },
    {
      key: "reason",
      header: "Reason",
      cell: (r) => (
        <span className="max-w-[280px] text-sm text-[#475569]">
          {r.reason.slice(0, 80)}
          {r.reason.length > 80 ? "…" : ""}
        </span>
      ),
    },
    { key: "date", header: "Opened", cell: (r) => r.date },
    {
      key: "status",
      header: "Status",
      cell: (r) => <StatusBadge status={r.status} />,
    },
    {
      key: "actions",
      header: "",
      cell: (r) => (
        <Link
          href={`/admin/disputes/${r.id}`}
          className="text-sm font-bold text-[#1d4ed8] hover:underline"
        >
          Open case
        </Link>
      ),
    },
  ];

  return (
    <DashboardSubPage
      title="Disputes"
      description="Scoped case workflow: open → under review → resolved or rejected. Customers raise cases from eligible bookings."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Open" value={String(openCount ?? 0)} icon="inbox" highlight />
        <KpiCard
          label="Under review"
          value={String(reviewCount ?? 0)}
          icon="pending_actions"
        />
        <KpiCard
          label="Resolved"
          value={String(resolvedCount ?? 0)}
          icon="task_alt"
        />
      </div>

      <Panel>
        <PanelHeader
          title="Cases"
          description="Filter and open a dispute to advance its lifecycle."
        />
        <form className="mb-4 flex flex-wrap gap-3" method="get">
          <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-wide text-[#64748b]">
            Status
            <select
              name="status"
              defaultValue={status}
              className="h-10 min-w-[180px] rounded-xl border border-[#dbe3ef] bg-white px-3 text-sm font-semibold text-[#0f172a]"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="mt-5 h-10 rounded-xl bg-[#1d4ed8] px-4 text-sm font-bold text-white"
          >
            Apply
          </button>
        </form>

        {rows.length > 0 ? (
          <DataTable
            rows={rows}
            keyFn={(r) => r.id}
            columns={columns}
            emptyMessage="No disputes found."
          />
        ) : (
          <EmptyState
            icon="gavel"
            title="No disputes in this filter"
            description="When customers raise a dispute on an eligible booking, it appears here for review."
          />
        )}
      </Panel>
    </DashboardSubPage>
  );
}
