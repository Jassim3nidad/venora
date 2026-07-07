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
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Venue Approval - Admin" };

type PendingVenueRow = {
  id: string;
  name: string;
  city: string | null;
  province: string | null;
  status: string;
  created_at: string;
  organizations: { name: string | null } | null;
};

type VenueDisplayRow = {
  id: string;
  name: string;
  organization: string;
  location: string;
  submitted: string;
  status: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-PH", { dateStyle: "medium" });
}

export default async function AdminVenuesPage() {
  const supabase = (await createClient()) as any;
  const { data: pending } = await supabase
    .from("venues")
    .select(
      `
      id,
      name,
      city,
      province,
      status,
      created_at,
      organizations (
        name
      )
    `,
    )
    .in("status", ["pending_approval", "pending_review"])
    .order("created_at", { ascending: false });

  const rows: VenueDisplayRow[] = ((pending ?? []) as PendingVenueRow[]).map(
    (venue) => ({
      id: venue.id,
      name: venue.name,
      organization: venue.organizations?.name ?? "Venue owner",
      location: [venue.city, venue.province].filter(Boolean).join(", ") || "-",
      submitted: formatDate(venue.created_at),
      status: venue.status,
    }),
  );

  const columns: DataTableColumn<VenueDisplayRow>[] = [
    {
      key: "venue",
      header: "Venue",
      cell: (row) => (
        <div>
          <p className="font-semibold text-[#111827]">{row.name}</p>
          <p className="text-xs text-[#6b7280]">{row.location}</p>
        </div>
      ),
    },
    { key: "organization", header: "Organization", cell: (row) => row.organization },
    { key: "submitted", header: "Submitted", cell: (row) => row.submitted },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status="pending" label={row.status.replace(/_/g, " ")} />,
    },
  ];

  return (
    <DashboardSubPage
      title="Venue Approval Queue"
      description="Review venue listings that are waiting for admin approval."
    >
      {rows.length > 0 ? (
        <Panel>
          <PanelHeader
            title="Pending Venues"
            description="Approval actions are intentionally hidden until the venue review action is fully wired."
          />
          <DataTable rows={rows} columns={columns} keyFn={(row) => row.id} />
        </Panel>
      ) : (
        <EmptyState
          icon="verified"
          title="No pending venues"
          description="Venue submissions that need admin review will appear here."
        />
      )}
    </DashboardSubPage>
  );
}
