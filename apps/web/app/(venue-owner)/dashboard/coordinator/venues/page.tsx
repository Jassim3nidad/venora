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
  getOwnerVenueIds,
  hasCoordinatorPermission,
  requireCoordinatorPermission,
} from "@/lib/dashboard/org-dashboard-data";

export const metadata: Metadata = { title: "Venues - Coordinator Dashboard" };
export const dynamic = "force-dynamic";

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

export default async function CoordinatorVenuesPage() {
  const context = await getOwnerDashboardContext();
  requireCoordinatorPermission("view_assigned_venues", context);
  const canManageListings = hasCoordinatorPermission(
    "manage_assigned_venue_listings",
    context,
  );
  const { supabase, isAdmin } = context;
  const venueIds = await getOwnerVenueIds(context);

  let venuesQuery = supabase
    .from("venues")
    .select(
      "id, name, status, city, province, capacity_min, capacity_max, base_price, avg_rating, review_count",
    )
    .order("name", { ascending: true });
  if (!isAdmin) venuesQuery = venuesQuery.in("id", venueIds);

  const { data: venues } =
    isAdmin || venueIds.length > 0 ? await venuesQuery : { data: [] };

  const rows: VenueDisplayRow[] = ((venues ?? []) as VenueRow[]).map(
    (venue) => ({
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
    }),
  );

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
      header: "",
      cell: (row) =>
        canManageListings ? (
          <DashButton
            href={`/dashboard/venues/${row.id}/edit`}
            variant="secondary"
            icon="edit"
            className="px-3 py-2 text-xs"
          >
            Edit listing
          </DashButton>
        ) : (
          <DashButton
            href={`/dashboard/venues/${row.id}/edit`}
            variant="secondary"
            icon="visibility"
            className="px-3 py-2 text-xs"
          >
            View
          </DashButton>
        ),
    },
  ];

  return (
    <DashboardSubPage
      title="Venues"
      description={
        canManageListings
          ? "Manage listing details, media, amenities, and packages for venues assigned to you. Creating or deleting venues stays with the venue owner."
          : "Venues assigned to you. Ask your owner for manage listing permission to edit profiles and packages."
      }
      action={
        rows.length > 0 && canManageListings ? (
          <DashButton
            href="/dashboard/packages"
            variant="secondary"
            icon="inventory_2"
          >
            Manage packages
          </DashButton>
        ) : null
      }
    >
      {rows.length > 0 ? (
        <Panel>
          <PanelHeader
            title="Assigned venues"
            description={
              canManageListings
                ? "Open a listing to update profile, gallery, rules, amenities, and packages."
                : "You can review assigned venues. Listing edits require manage_assigned_venue_listings."
            }
          />
          <DataTable rows={rows} columns={columns} keyFn={(row) => row.id} />
        </Panel>
      ) : (
        <EmptyState
          icon="location_city"
          title="No venues yet"
          description="Ask your organization owner to assign you as a coordinator on their venues so they appear here."
        />
      )}
    </DashboardSubPage>
  );
}
