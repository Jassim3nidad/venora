import type { Metadata } from "next";
import Link from "next/link";
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

  if (!isAdmin && orgIds.length === 0) {
    return (
      <DashboardSubPage
        title="Venues"
        description="Review and maintain the venues connected to your organization."
      >
        <EmptyState
          icon="business"
          title="Create your organization first"
          description="Venues belong to an organization. Set up your business profile, then add your first venue."
          action={
            <DashButton href="/dashboard/venues/new" icon="add_business">
              Create organization
            </DashButton>
          }
        />
      </DashboardSubPage>
    );
  }

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
          <Link
            href={`/dashboard/venues/${row.id}/edit`}
            className="font-semibold text-[#111827] transition hover:text-[#2563eb]"
          >
            {row.name}
          </Link>
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
        <div className="flex flex-wrap gap-2">
          <DashButton
            href={`/dashboard/venues/${row.id}/experience`}
            variant="secondary"
            icon="auto_awesome"
            className="px-3 py-2 text-xs"
          >
            Experience
          </DashButton>
          <DashButton
            href={`/dashboard/venues/${row.id}/edit`}
            variant="secondary"
            icon="edit"
            className="px-3 py-2 text-xs"
          >
            Edit
          </DashButton>
        </div>
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
          <DataTable
            rows={rows}
            columns={columns}
            keyFn={(row) => row.id}
            renderMobileCard={(row) => (
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/dashboard/venues/${row.id}/edit`}
                      className="text-base font-bold text-[#111827] transition hover:text-[#2563eb]"
                    >
                      {row.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-[#6b7280]">
                      {row.location || "Location pending"}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge status={row.status} />
                  </div>
                </div>

                <div className="my-2 h-px w-full bg-[#f1f5f9]" />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
                      Capacity
                    </p>
                    <p className="mt-1 font-medium text-[#334155]">{row.capacity}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
                      Base Price
                    </p>
                    <p className="mt-1 font-medium text-[#334155]">{row.basePrice}</p>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-sm text-[#475569]">
                    <span className="material-symbols-outlined text-[16px] text-[#fbbf24]">
                      star
                    </span>
                    <span className="font-medium">{row.rating}</span>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <DashButton
                      href={`/dashboard/venues/${row.id}/experience`}
                      variant="secondary"
                      icon="auto_awesome"
                      className="h-8 min-h-0 px-3 py-1 text-xs"
                    >
                      Experience
                    </DashButton>
                    <DashButton
                      href={`/dashboard/venues/${row.id}/edit`}
                      variant="secondary"
                      icon="edit"
                      className="h-8 min-h-0 px-3 py-1 text-xs"
                    >
                      Edit
                    </DashButton>
                  </div>
                </div>
              </div>
            )}
          />
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
