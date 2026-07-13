import type { Metadata } from "next";
import {
  DashboardSubPage,
  DataTable,
  EmptyState,
  Panel,
  PanelHeader,
  StatusBadge,
  type DataTableColumn,
} from "@/components/dashboard/enterprise";
import { requirePermissionOrRedirect } from "@/lib/rbac/admin-context";
import { auditLogFiltersSchema } from "@/features/admin-audit-logs/schemas/audit-log-filters.schema";
import { getAuditLogs } from "@/features/admin-audit-logs/application/queries";
import type { AuditLogEntry } from "@/features/admin-audit-logs/types/audit-log.types";

export const metadata: Metadata = { title: "Audit Logs - Admin" };
export const dynamic = "force-dynamic";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

function JsonDetails({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined) return null;
  return (
    <details className="text-xs">
      <summary className="cursor-pointer font-semibold text-[#2563eb]">{label}</summary>
      <pre className="mt-1 max-w-[320px] overflow-x-auto rounded-lg bg-[#f8fafc] p-2 text-[11px] text-[#475569]">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

type Props = {
  searchParams: Promise<Record<string, string | undefined>>;
};

export default async function AdminAuditLogsPage({ searchParams }: Props) {
  // Page-level check: audit_logs.view is stricter than plain "is admin" —
  // RLS would otherwise just return an empty list, which reads as "no
  // events" rather than "you're not permitted," so we surface it clearly.
  await requirePermissionOrRedirect("audit_logs.view");

  const rawParams = await searchParams;
  const parsed = auditLogFiltersSchema.safeParse(rawParams);
  const filters = parsed.success ? parsed.data : { page: 1 };

  const { result, error } = await getAuditLogs(filters);

  const totalPages = result ? Math.max(Math.ceil(result.total / result.pageSize), 1) : 1;
  const currentPage = result?.page ?? 1;

  function pageHref(page: number) {
    const params = new URLSearchParams();
    if (filters.action) params.set("action", filters.action);
    if (filters.resourceType) params.set("resourceType", filters.resourceType);
    if (filters.resourceId) params.set("resourceId", filters.resourceId);
    if (filters.actorId) params.set("actorId", filters.actorId);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);
    params.set("page", String(page));
    return `/admin/audit-logs?${params.toString()}`;
  }

  const columns: DataTableColumn<AuditLogEntry>[] = [
    {
      key: "when",
      header: "When",
      cell: (row) => <span className="whitespace-nowrap">{formatDateTime(row.createdAt)}</span>,
    },
    {
      key: "actor",
      header: "Actor",
      cell: (row) => (
        <div>
          <p className="font-semibold text-[#111827]">{row.actorName ?? "System"}</p>
          {row.actorRole ? <p className="text-xs text-[#6b7280]">{row.actorRole.replace(/_/g, " ")}</p> : null}
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      cell: (row) => <StatusBadge status="active" label={row.action} />,
    },
    {
      key: "resource",
      header: "Resource",
      cell: (row) => (
        <span className="text-[#475569]">
          {row.resourceType}
          {row.resourceId ? <span className="text-[#6b7280]"> · {row.resourceId.slice(0, 8)}</span> : null}
        </span>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      className: "max-w-[220px]",
      cell: (row) => <span className="line-clamp-2 text-[#4b5563]">{row.reason ?? "—"}</span>,
    },
    {
      key: "details",
      header: "Details",
      cell: (row) => (
        <div className="space-y-1">
          <JsonDetails label="Metadata" value={row.metadata} />
          <JsonDetails label="Previous" value={row.previousValues} />
          <JsonDetails label="New" value={row.newValues} />
        </div>
      ),
    },
  ];

  return (
    <DashboardSubPage
      title="Audit Logs"
      description="Every significant administrator and system action, append-only."
    >
      <Panel>
        <PanelHeader title="Filters" description="All filters are server-side and combine with AND." />
        <form method="GET" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="action" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#64748b]">
              Action
            </label>
            <input
              id="action"
              name="action"
              defaultValue={filters.action ?? ""}
              placeholder="e.g. venue.approved"
              className="w-full rounded-xl border border-[#dbe3ef] p-2.5 text-sm focus:border-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-[#dbeafe]"
            />
          </div>
          <div>
            <label htmlFor="resourceType" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#64748b]">
              Resource type
            </label>
            <input
              id="resourceType"
              name="resourceType"
              defaultValue={filters.resourceType ?? ""}
              placeholder="e.g. venue, booking, admin_user_roles"
              className="w-full rounded-xl border border-[#dbe3ef] p-2.5 text-sm focus:border-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-[#dbeafe]"
            />
          </div>
          <div>
            <label htmlFor="dateFrom" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#64748b]">
              From
            </label>
            <input
              id="dateFrom"
              type="date"
              name="dateFrom"
              defaultValue={filters.dateFrom ?? ""}
              className="w-full rounded-xl border border-[#dbe3ef] p-2.5 text-sm focus:border-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-[#dbeafe]"
            />
          </div>
          <div>
            <label htmlFor="dateTo" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#64748b]">
              To
            </label>
            <input
              id="dateTo"
              type="date"
              name="dateTo"
              defaultValue={filters.dateTo ?? ""}
              className="w-full rounded-xl border border-[#dbe3ef] p-2.5 text-sm focus:border-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-[#dbeafe]"
            />
          </div>
          <div className="flex gap-3 sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="inline-flex h-10 items-center rounded-xl bg-[#1d4ed8] px-5 text-sm font-bold text-white transition hover:bg-[#1e40af]"
            >
              Apply filters
            </button>
            <a
              href="/admin/audit-logs"
              className="inline-flex h-10 items-center rounded-xl border border-[#e5e7eb] bg-white px-5 text-sm font-bold text-[#111827] transition hover:border-[#1d4ed8] hover:text-[#1d4ed8]"
            >
              Clear
            </a>
          </div>
        </form>
      </Panel>

      {error ? (
        <EmptyState icon="error" title="Could not load audit logs" description={error} />
      ) : result && result.entries.length > 0 ? (
        <Panel>
          <PanelHeader
            title="Recent activity"
            description={`Showing ${result.entries.length} of ${result.total} matching events.`}
          />
          <DataTable rows={result.entries} columns={columns} keyFn={(row) => row.id} />

          {totalPages > 1 ? (
            <div className="mt-5 flex items-center justify-between">
              <a
                href={currentPage > 1 ? pageHref(currentPage - 1) : undefined}
                aria-disabled={currentPage <= 1}
                className={`inline-flex h-9 items-center rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm font-bold ${
                  currentPage <= 1 ? "pointer-events-none opacity-40" : "text-[#111827] hover:border-[#1d4ed8] hover:text-[#1d4ed8]"
                }`}
              >
                Previous
              </a>
              <span className="text-xs font-bold uppercase tracking-wide text-[#64748b]">
                Page {currentPage} of {totalPages}
              </span>
              <a
                href={currentPage < totalPages ? pageHref(currentPage + 1) : undefined}
                aria-disabled={currentPage >= totalPages}
                className={`inline-flex h-9 items-center rounded-lg border border-[#e5e7eb] bg-white px-3 text-sm font-bold ${
                  currentPage >= totalPages ? "pointer-events-none opacity-40" : "text-[#111827] hover:border-[#1d4ed8] hover:text-[#1d4ed8]"
                }`}
              >
                Next
              </a>
            </div>
          ) : null}
        </Panel>
      ) : (
        <EmptyState
          icon="history"
          title="No audit events found"
          description="No events match the selected filters, or none have been recorded yet."
        />
      )}
    </DashboardSubPage>
  );
}
