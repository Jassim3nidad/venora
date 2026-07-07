import type { Metadata } from "next";
import {
  DashboardSubPage,
  DashButton,
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
} from "../_lib/owner-dashboard-data";

export const metadata: Metadata = { title: "Packages - Dashboard" };

type PackageRow = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  price_unit: string;
  min_guests: number | null;
  max_guests: number | null;
  inclusions: string[];
  is_active: boolean;
  venues: { name: string } | null;
};

type PackageDisplayRow = {
  id: string;
  name: string;
  venue: string;
  price: string;
  guests: string;
  inclusions: string;
  status: string;
};

export default async function PackagesPage() {
  const context = await getOwnerDashboardContext();
  const { supabase } = context;
  const venueIds = await getOwnerVenueIds(context);

  const { data: packages } =
    venueIds.length > 0
      ? await supabase
          .from("venue_packages")
          .select(
            "id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active, venues(name)",
          )
          .in("venue_id", venueIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const rows: PackageDisplayRow[] = (packages ?? []).map((pkg: PackageRow) => ({
    id: pkg.id,
    name: pkg.name,
    venue: pkg.venues?.name ?? "-",
    price: formatPeso(pkg.price),
    guests:
      pkg.min_guests != null || pkg.max_guests != null
        ? `${pkg.min_guests ?? 1}-${pkg.max_guests ?? "Any"} guests`
        : "Any group size",
    inclusions:
      pkg.inclusions.length > 0
        ? pkg.inclusions.slice(0, 3).join(", ")
        : pkg.description ?? "-",
    status: pkg.is_active ? "active" : "inactive",
  }));

  const columns: DataTableColumn<PackageDisplayRow>[] = [
    {
      key: "package",
      header: "Package",
      cell: (row) => (
        <div>
          <p className="font-semibold text-[#111827]">{row.name}</p>
          <p className="text-xs text-[#6b7280]">{row.venue}</p>
        </div>
      ),
    },
    {
      key: "price",
      header: "Price",
      cell: (row) => (
        <span className="font-semibold text-[#111827]">{row.price}</span>
      ),
    },
    { key: "guests", header: "Guests", cell: (row) => row.guests },
    { key: "inclusions", header: "Inclusions", cell: (row) => row.inclusions },
    {
      key: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <DashboardSubPage
      title="Packages"
      description="Review venue packages, pricing, inclusions, and guest capacity."
      action={
        rows.length > 0 ? (
          <DashButton href="/dashboard/venues" variant="secondary" icon="location_city">
            Review Venues
          </DashButton>
        ) : null
      }
    >
      {rows.length > 0 ? (
        <Panel>
          <PanelHeader
            title="Published Packages"
            description="Packages shown here are attached to venues owned by your organization."
          />
          <DataTable rows={rows} columns={columns} keyFn={(row) => row.id} />
        </Panel>
      ) : (
        <EmptyState
          icon="inventory_2"
          title="No packages configured"
          description="Packages connected to your venues will appear here. Add package records once your venue setup flow is available."
          action={
            <DashButton href="/dashboard/venues" variant="secondary" icon="location_city">
              Review Venues
            </DashButton>
          }
        />
      )}
    </DashboardSubPage>
  );
}
