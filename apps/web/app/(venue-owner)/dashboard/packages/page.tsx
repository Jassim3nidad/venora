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
import Link from "next/link";
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
        : (pkg.description ?? "-"),
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
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <div className="flex justify-end">
          <Link
            href={`/dashboard/packages/${row.id}/edit`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-blue-600"
            title="Edit Package"
          >
            <span className="material-symbols-outlined text-[20px]">edit</span>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <DashboardSubPage
      title="Packages"
      description="Review venue packages, pricing, inclusions, and guest capacity."
      action={
        <div className="flex gap-3">
          {rows.length > 0 && (
            <DashButton
              href="/dashboard/venues"
              variant="secondary"
              icon="location_city"
            >
              Review Venues
            </DashButton>
          )}
          <Link
            href="/dashboard/packages/new"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-[#1d4ed8] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#1e40af]"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Package
          </Link>
        </div>
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
          title="No packages yet"
          description="Create your first venue package — include pricing, amenities, and accredited suppliers."
          action={
            <Link
              href="/dashboard/packages/new"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-[#1d4ed8] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#1e40af]"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Create First Package
            </Link>
          }
        />
      )}
    </DashboardSubPage>
  );
}
