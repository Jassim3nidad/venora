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
import {
  getSuppliersForAdminReview,
  type SupplierQueueFilter,
  type SupplierQueueRow,
} from "@/features/suppliers/application/admin-queries";

export const metadata: Metadata = { title: "Supplier Accreditation - Admin" };
export const dynamic = "force-dynamic";

const FILTER_TABS: { key: SupplierQueueFilter; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "accredited", label: "Accredited" },
  { key: "suspended", label: "Suspended" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-PH", { dateStyle: "medium" });
}

type Props = {
  searchParams: Promise<{ filter?: string }>;
};

export default async function AdminSuppliersPage({ searchParams }: Props) {
  await requirePermissionOrRedirect("suppliers.view");

  const { filter: rawFilter } = await searchParams;
  const filter: SupplierQueueFilter = FILTER_TABS.some(
    (t) => t.key === rawFilter,
  )
    ? (rawFilter as SupplierQueueFilter)
    : "pending";

  const { suppliers, error } = await getSuppliersForAdminReview(filter);

  const columns: DataTableColumn<SupplierQueueRow>[] = [
    {
      key: "supplier",
      header: "Supplier",
      cell: (row) => (
        <a
          href={`/admin/suppliers/${row.id}`}
          className="font-semibold text-[#111827] hover:text-[#1d4ed8] hover:underline"
        >
          {row.businessName}
        </a>
      ),
    },
    {
      key: "status",
      header: "Accreditation",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "rating",
      header: "Rating",
      cell: (row) =>
        row.reviewCount > 0
          ? `${row.avgRating.toFixed(1)} (${row.reviewCount})`
          : "No reviews",
    },
    { key: "added", header: "Added", cell: (row) => formatDate(row.createdAt) },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cell: (row) => (
        <a
          href={`/admin/suppliers/${row.id}`}
          className="inline-flex h-8 items-center rounded-lg border border-[#dbe3ef] bg-white px-3 text-xs font-bold text-[#0f172a] shadow-sm transition hover:border-[#93c5fd] hover:text-[#1d4ed8]"
        >
          Review Details
        </a>
      ),
    },
  ];

  return (
    <DashboardSubPage
      title="Supplier Accreditation"
      description="Review supplier profiles and manage accreditation status."
      action={
        <div className="flex flex-wrap gap-2">
          {FILTER_TABS.map((tab) => (
            <a
              key={tab.key}
              href={`/admin/suppliers?filter=${tab.key}`}
              className={`inline-flex h-9 items-center rounded-lg px-3 text-sm font-bold transition ${
                filter === tab.key
                  ? "bg-[#1d4ed8] text-white"
                  : "border border-[#dbe3ef] bg-white text-[#111827] hover:border-[#1d4ed8] hover:text-[#1d4ed8]"
              }`}
            >
              {tab.label}
            </a>
          ))}
        </div>
      }
    >
      {error ? (
        <EmptyState
          icon="error"
          title="Could not load suppliers"
          description={error}
        />
      ) : suppliers && suppliers.length > 0 ? (
        <Panel>
          <PanelHeader
            title={
              FILTER_TABS.find((t) => t.key === filter)?.label ?? "Suppliers"
            }
            description="Select a supplier to review details and take action."
          />
          <DataTable
            rows={suppliers}
            columns={columns}
            keyFn={(row) => row.id}
          />
        </Panel>
      ) : (
        <EmptyState
          icon="storefront"
          title="No suppliers match this filter"
          description="Supplier submissions that need admin review will appear here."
        />
      )}
    </DashboardSubPage>
  );
}
