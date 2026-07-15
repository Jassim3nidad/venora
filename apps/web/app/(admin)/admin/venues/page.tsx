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
  getVenuesForAdminReview,
  type VenueQueueFilter,
  type VenueQueueRow,
} from "@/features/venues/application/admin-queries";

export const metadata: Metadata = { title: "Venue Approval - Admin" };
export const dynamic = "force-dynamic";

const FILTER_TABS: { key: VenueQueueFilter; label: string }[] = [
  { key: "pending", label: "Pending approval" },
  { key: "published", label: "Published" },
  { key: "suspended", label: "Suspended" },
  { key: "all", label: "All" },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-PH", { dateStyle: "medium" });
}

type Props = {
  searchParams: Promise<{ filter?: string }>;
};

export default async function AdminVenuesPage({ searchParams }: Props) {
  await requirePermissionOrRedirect("venues.view");

  const { filter: rawFilter } = await searchParams;
  const filter: VenueQueueFilter = FILTER_TABS.some((t) => t.key === rawFilter)
    ? (rawFilter as VenueQueueFilter)
    : "pending";

  const { venues, error } = await getVenuesForAdminReview(filter);

  const columns: DataTableColumn<VenueQueueRow>[] = [
    {
      key: "venue",
      header: "Venue",
      cell: (row) => (
        <a
          href={`/admin/venues/${row.id}`}
          className="font-semibold text-[#111827] hover:text-[#1d4ed8] hover:underline"
        >
          {row.name}
        </a>
      ),
    },
    {
      key: "organization",
      header: "Organization",
      cell: (row) => row.organizationName ?? "—",
    },
    {
      key: "location",
      header: "Location",
      cell: (row) => [row.city, row.province].filter(Boolean).join(", ") || "—",
    },
    {
      key: "submitted",
      header: "Submitted",
      cell: (row) => formatDate(row.createdAt),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <DashboardSubPage
      title="Venue Approval"
      description="Review venue listings and manage publication status."
      action={
        <div className="flex flex-wrap gap-2">
          {FILTER_TABS.map((tab) => (
            <a
              key={tab.key}
              href={`/admin/venues?filter=${tab.key}`}
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
          title="Could not load venues"
          description={error}
        />
      ) : venues && venues.length > 0 ? (
        <Panel>
          <PanelHeader
            title={FILTER_TABS.find((t) => t.key === filter)?.label ?? "Venues"}
            description="Select a venue to review details and take action."
          />
          <DataTable rows={venues} columns={columns} keyFn={(row) => row.id} />
        </Panel>
      ) : (
        <EmptyState
          icon="verified"
          title="No venues match this filter"
          description="Venue submissions that need admin review will appear here."
        />
      )}
    </DashboardSubPage>
  );
}
