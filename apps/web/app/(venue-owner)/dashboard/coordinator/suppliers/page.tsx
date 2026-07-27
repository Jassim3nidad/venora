import type { Metadata } from "next";
import {
  DashboardSubPage,
  EmptyState,
  MaterialIcon,
  Panel,
  StatusBadge,
} from "@/components/dashboard/enterprise";
import {
  formatPeso,
  getOwnerDashboardContext,
  getOwnerVenueIds,
  requireCoordinatorPermission,
} from "@/lib/dashboard/org-dashboard-data";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Suppliers - Coordinator Dashboard",
};
export const dynamic = "force-dynamic";

type SupplierCategory = { id: string; name: string; slug: string };

type SupplierRow = {
  id: string;
  business_name: string;
  description: string | null;
  base_price: number | null;
  price_unit: string | null;
  avg_rating: number;
  review_count: number;
  hero_image_url: string | null;
  profile_image_url: string | null;
  supplier_categories: { name: string; slug: string } | null;
};

type Props = {
  searchParams: Promise<{ q?: string; category?: string }>;
};

export default async function CoordinatorSuppliersPage({
  searchParams,
}: Props) {
  const { q, category } = await searchParams;
  const context = await getOwnerDashboardContext();
  requireCoordinatorPermission("view_accredited_suppliers", context);
  const { supabase } = context;

  const venueIds = await getOwnerVenueIds(context);

  const { data: venueSuppliers } =
    venueIds.length > 0
      ? await supabase
          .from("venue_suppliers")
          .select("id, supplier_id, status")
          .in("venue_id", venueIds)
      : { data: [] };

  const supplierIds = Array.from(
    new Set((venueSuppliers ?? []).map((vs: any) => vs.supplier_id)),
  );

  const { data: categories } = await supabase
    .from("supplier_categories")
    .select("id, name, slug")
    .order("name", { ascending: true });

  let query = supabase
    .from("supplier_profiles")
    .select(
      "id, business_name, description, base_price, price_unit, avg_rating, review_count, hero_image_url, profile_image_url, supplier_categories(name, slug)",
    )
    .order("avg_rating", { ascending: false });

  // Coordinators and Venue Owners can both browse the global directory of suppliers
  // to find new partners to invite to their venues.

  if (q) query = query.ilike("business_name", `%${q}%`);

  const { data: suppliersRaw } = await query;

  // Filtering by an embedded relation's column isn't reliable through the
  // PostgREST query builder here, so the category filter is applied in JS
  let suppliers = ((suppliersRaw ?? []) as SupplierRow[]).filter((s) =>
    category ? s.supplier_categories?.slug === category : true,
  );

  return (
    <DashboardSubPage
      title="Suppliers"
      description="Discover accredited suppliers to recommend for your coordinated events."
    >
      <div className="mb-6 flex items-center justify-end">
        <Link
          href="/dashboard/coordinator/suppliers/requests"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-amber-50 px-4 text-sm font-bold text-amber-700 transition hover:bg-amber-100 border border-amber-200"
        >
          <MaterialIcon name="pending_actions" className="text-lg" />
          Review Incoming Requests
        </Link>
      </div>
      <Panel>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
          method="get"
        >
          <div className="relative flex-1">
            <MaterialIcon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]"
            />
            <input
              type="text"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search suppliers by name..."
              className="h-11 w-full rounded-xl border border-[#e5e7eb] bg-white pl-10 pr-3 text-sm font-medium text-[#111827] outline-none focus:border-[#1d4ed8] focus:ring-4 focus:ring-[#1d4ed8]/10"
            />
          </div>
          <select
            name="category"
            defaultValue={category ?? ""}
            className="h-11 rounded-xl border border-[#e5e7eb] bg-white px-3 text-sm font-semibold text-[#111827] outline-none focus:border-[#1d4ed8] focus:ring-4 focus:ring-[#1d4ed8]/10"
          >
            <option value="">All categories</option>
            {(categories ?? []).map((cat: SupplierCategory) => (
              <option key={cat.id} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1d4ed8] px-5 text-sm font-bold text-white transition hover:bg-[#1e40af]"
          >
            Filter
          </button>
        </form>
      </Panel>

      {suppliers.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {suppliers.map((supplier) => (
            <Link 
              key={supplier.id}
              href={`/dashboard/coordinator/suppliers/${supplier.id}`}
              className="group relative flex flex-col rounded-[24px] bg-white border border-slate-200 overflow-hidden shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/20"
            >
              {/* Image Section */}
              <div className="relative h-48 w-full overflow-hidden bg-slate-100">
                {(supplier.hero_image_url || supplier.profile_image_url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={supplier.hero_image_url || supplier.profile_image_url || ""}
                    alt={supplier.business_name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                    <MaterialIcon name="storefront" className="text-4xl text-slate-300" />
                  </div>
                )}
                
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0 pointer-events-none" />

                {/* Badges */}
                <div className="absolute top-4 left-4 flex gap-2">
                  {supplier.supplier_categories ? (
                    <div className="rounded-full bg-white/95 backdrop-blur-md px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-900 shadow-sm">
                      {supplier.supplier_categories.name}
                    </div>
                  ) : null}
                </div>
                
                <div className="absolute top-4 right-4">
                  {supplier.review_count > 0 ? (
                    <div className="flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-xs font-black text-amber-950 shadow-md">
                      <MaterialIcon name="star" className="text-[14px]" filled />
                      {Number(supplier.avg_rating).toFixed(1)}
                    </div>
                  ) : (
                    <div className="rounded-full bg-blue-500 px-2.5 py-1 text-[10px] font-black text-white shadow-md uppercase tracking-wider">
                      New
                    </div>
                  )}
                </div>
              </div>

              {/* Content Section */}
              <div className="flex flex-1 flex-col p-5">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-display text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                    {supplier.business_name}
                  </h3>
                </div>

                {supplier.description ? (
                  <p className="line-clamp-2 text-sm text-slate-500 font-medium leading-relaxed">
                    {supplier.description}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400 italic">No description provided.</p>
                )}

                <div className="mt-auto pt-5">
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Starting at</span>
                      <span className="text-base font-black text-slate-900">
                        {supplier.base_price ? formatPeso(supplier.base_price) : "Custom Quote"}
                      </span>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                      <MaterialIcon name="arrow_forward" className="text-xl" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="storefront"
          title="No suppliers found"
          description="Try a different search term or category. Registered suppliers will appear in this directory."
        />
      )}
    </DashboardSubPage>
  );
}
