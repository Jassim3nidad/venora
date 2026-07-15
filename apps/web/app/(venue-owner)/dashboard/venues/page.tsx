import type { Metadata } from "next";
import {
  DashButton,
  DashboardSubPage,
  DataTable,
  EmptyState,
  Panel,
  PanelHeader,
  StatusBadge,
  type DataTableColumn,
} from "@/components/dashboard/enterprise";
import {
  formatPeso,
  getOwnerDashboardContext,
} from "../_lib/owner-dashboard-data";

export const metadata: Metadata = { title: "Venues - Dashboard" };

type VenueRow = {
  id: string;
  name: string;
  status: string;
  city: string;
  province: string;
  capacity_min: number | null;
  capacity_max: number;
  base_price: number;
  avg_rating: number;
  review_count: number;
  created_at: string;
};

type VenueDisplayRow = {
  id: string;
  name: string;
  location: string;
  capacity: string;
  basePrice: string;
  rating: string;
  status: string;
};

export default async function OwnerVenuesPage() {
  const { supabase, orgIds, isAdmin } = await getOwnerDashboardContext();

  let venuesQuery = supabase
    .from("venues")
    .select(
      "id, name, status, city, province, capacity_min, capacity_max, base_price, avg_rating, review_count, created_at",
    )
    .order("created_at", { ascending: false });

  if (!isAdmin) venuesQuery = venuesQuery.in("organization_id", orgIds);

  const { data: venues } =
    isAdmin || orgIds.length > 0 ? await venuesQuery : { data: [] };

  const rows: VenueDisplayRow[] = (venues ?? []).map((venue: VenueRow) => ({
    id: venue.id,
    name: venue.name,
    location: [venue.city, venue.province].filter(Boolean).join(", "),
    capacity:
      venue.capacity_min != null
        ? `${venue.capacity_min}-${venue.capacity_max} guests`
        : `${venue.capacity_max} guests`,
    basePrice: formatPeso(venue.base_price),
    rating:
      venue.review_count > 0
        ? `${Number(venue.avg_rating).toFixed(1)} (${venue.review_count})`
        : "No reviews",
    status: venue.status,
  }));

  const columns: DataTableColumn<VenueDisplayRow>[] = [
    {
      key: "venue",
      header: "Venue",
      cell: (row) => (
        <div>
          <p className="font-semibold text-[#111827]">{row.name}</p>
          <p className="text-xs text-[#6b7280]">
            {row.location || "Location pending"}
          </p>
        </div>
      ),
    },
    { key: "capacity", header: "Capacity", cell: (row) => row.capacity },
    {
      key: "basePrice",
      header: "Base Price",
      cell: (row) => (
        <span className="font-semibold text-[#111827]">{row.basePrice}</span>
      ),
    },
    { key: "rating", header: "Rating", cell: (row) => row.rating },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      cell: (row) => (
        <DashButton
          href={`/dashboard/venues/${row.id}/edit`}
          variant="secondary"
          icon="edit"
          className="px-3 py-2 text-xs"
        >
          Edit
        </DashButton>
      ),
    },
  ];

  return (
    <DashboardSubPage
      title="Venues"
      description="Review and maintain the venues connected to your organization."
      action={
        <div className="flex flex-wrap gap-2">
          <DashButton href="/dashboard/venues/new" icon="add">
            Add Venue
          </DashButton>
          {rows.length > 0 ? (
            <DashButton
              href="/dashboard/packages"
              variant="secondary"
              icon="inventory_2"
            >
              Manage Packages
            </DashButton>
          ) : null}
        </div>
      }
    >
      {rows.length > 0 ? (
        <Panel>
          <PanelHeader
            title="Venue Inventory"
            description="Only venues owned by your organization appear here."
          />
          <DataTable rows={rows} columns={columns} keyFn={(row) => row.id} />
        </Panel>
      ) : (
        <EmptyState
          icon="location_city"
          title="No venues connected yet"
          description="Create your first venue listing. New venues enter the approval queue before they appear publicly."
          action={
            <DashButton href="/dashboard/venues/new" icon="add">
              Add Venue
            </DashButton>
          }
        />
      )}
    </DashboardSubPage>
  );
}
