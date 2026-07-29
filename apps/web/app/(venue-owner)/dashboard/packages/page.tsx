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
import { PackageFilters } from "./_components/PackageFilters";

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

export default async function PackagesPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const venueIdFilter =
    typeof searchParams.venueId === "string" ? searchParams.venueId : null;
  const searchFilter =
    typeof searchParams.q === "string" ? searchParams.q : null;

  const context = await getOwnerDashboardContext();
  const { supabase, isAdmin, roles, permissions } = context;
  const venueIds = await getOwnerVenueIds(context);
  const isCoordinatorOnly =
    !isAdmin &&
    !roles.includes("venue_owner") &&
    roles.includes("event_coordinator");
  const canManagePackages =
    isAdmin ||
    roles.includes("venue_owner") ||
    (roles.includes("event_coordinator") &&
      permissions.includes("manage_assigned_venue_listings"));
  const venuesHref = isCoordinatorOnly
    ? "/dashboard/coordinator/venues"
    : "/dashboard/venues";

  // Fetch all venues for the filter dropdown
  const { data: allVenues } =
    venueIds.length > 0
      ? await supabase
          .from("venues")
          .select("id, name")
          .in("id", venueIds)
          .order("name")
      : { data: [] };

  const activeVenueIds =
    venueIdFilter && venueIds.includes(venueIdFilter)
      ? [venueIdFilter]
      : venueIds;

  let packagesQuery = supabase
    .from("venue_packages")
    .select(
      "id, name, description, price, price_unit, min_guests, max_guests, inclusions, is_active, venues(name)",
    )
    .in("venue_id", activeVenueIds)
    .order("created_at", { ascending: false });

  if (searchFilter) {
    packagesQuery = packagesQuery.ilike("name", `%${searchFilter}%`);
  }

  const { data: packages } = venueIds.length > 0 ? await packagesQuery : { data: [] };

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
          <Link
            href={`/dashboard/packages/${row.id}/edit`}
            className="font-semibold text-[#111827] transition hover:text-[#2563eb]"
          >
            {row.name}
          </Link>
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
      cell: (row) =>
        canManagePackages ? (
          <div className="flex justify-end">
            <Link
              href={`/dashboard/packages/${row.id}/edit`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-blue-600"
              title="Edit Package"
            >
              <span className="material-symbols-outlined text-[20px]">edit</span>
            </Link>
          </div>
        ) : null,
    },
  ];

  return (
    <DashboardSubPage
      title="Packages"
      description="Review venue packages, pricing, inclusions, and guest capacity."
      action={
        <div className="flex gap-3">
          {venueIds.length > 0 && (
            <DashButton
              href={venuesHref}
              variant="secondary"
              icon="location_city"
            >
              Review Venues
            </DashButton>
          )}
          {canManagePackages ? (
            <Link
              href="/dashboard/packages/new"
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-[#1d4ed8] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#1e40af]"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              New Package
            </Link>
          ) : null}
        </div>
      }
    >
      {venueIds.length > 0 ? (
        <Panel>
          <PanelHeader
            title="Published Packages"
            description="Packages shown here are attached to venues owned by your organization."
            action={
              allVenues && allVenues.length > 0 ? (
                <PackageFilters venues={allVenues} />
              ) : undefined
            }
          />
          <DataTable
            rows={rows}
            columns={columns}
            keyFn={(row) => row.id}
            emptyMessage="No packages match your filters."
            renderMobileCard={(row) => (
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/dashboard/packages/${row.id}/edit`}
                      className="text-base font-bold text-[#111827] transition hover:text-[#2563eb]"
                    >
                      {row.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-[#6b7280]">{row.venue}</p>
                  </div>
                  <div className="shrink-0">
                    <StatusBadge status={row.status} />
                  </div>
                </div>

                <div className="my-2 h-px w-full bg-[#f1f5f9]" />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
                      Price
                    </p>
                    <p className="mt-1 font-medium text-[#334155]">{row.price}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
                      Guests
                    </p>
                    <p className="mt-1 font-medium text-[#334155]">{row.guests}</p>
                  </div>
                </div>

                <div className="mt-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
                    Inclusions
                  </p>
                  <p className="mt-1 text-sm text-[#475569] line-clamp-2">
                    {row.inclusions}
                  </p>
                </div>

                <div className="mt-2 flex items-center justify-end">
                  <DashButton
                    href={`/dashboard/packages/${row.id}/edit`}
                    variant="secondary"
                    icon="edit"
                    className="h-8 min-h-0 px-3 py-1 text-xs"
                  >
                    Edit
                  </DashButton>
                </div>
              </div>
            )}
          />
        </Panel>
      ) : (
        <EmptyState
          icon="inventory_2"
          title="No packages yet"
          description={
            canManagePackages
              ? "Create your first venue package — include pricing, amenities, and accredited suppliers."
              : "No packages on your assigned venues yet. Ask the venue owner to grant listing management if you need to create them."
          }
          action={
            canManagePackages ? (
              <Link
                href="/dashboard/packages/new"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-[#1d4ed8] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#1e40af]"
              >
                <span className="material-symbols-outlined text-[18px]">
                  add
                </span>
                Create First Package
              </Link>
            ) : undefined
          }
        />
      )}
    </DashboardSubPage>
  );
}
