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
} from "@/lib/dashboard/org-dashboard-data";

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
  supplier_categories: { name: string; slug: string } | null;
};

type Props = {
  searchParams: Promise<{ q?: string; category?: string }>;
};

export default async function CoordinatorSuppliersPage({
  searchParams,
}: Props) {
  const { q, category } = await searchParams;
  const { supabase } = await getOwnerDashboardContext();

  const { data: categories } = await supabase
    .from("supplier_categories")
    .select("id, name, slug")
    .order("name", { ascending: true });

  let query = supabase
    .from("supplier_profiles")
    .select(
      "id, business_name, description, base_price, price_unit, avg_rating, review_count, supplier_categories(name, slug)",
    )
    .eq("accreditation_status", "accredited")
    .order("avg_rating", { ascending: false });

  if (q) query = query.ilike("business_name", `%${q}%`);

  const { data: suppliersRaw } = await query;

  // Filtering by an embedded relation's column isn't reliable through the
  // PostgREST query builder here, so the category filter is applied in JS
  // once the (small) accredited supplier list has been fetched.
  const suppliers = ((suppliersRaw ?? []) as SupplierRow[]).filter((s) =>
    category ? s.supplier_categories?.slug === category : true,
  );

  return (
    <DashboardSubPage
      title="Suppliers"
      description="Discover accredited suppliers to recommend for your coordinated events."
    >
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {suppliers.map((supplier) => (
            <Panel key={supplier.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eff6ff] text-[#1d4ed8]">
                  <MaterialIcon name="storefront" />
                </div>
                {supplier.review_count > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                    <MaterialIcon name="star" className="text-sm" filled />
                    {Number(supplier.avg_rating).toFixed(1)} (
                    {supplier.review_count})
                  </span>
                ) : (
                  <StatusBadge status="active" label="New" />
                )}
              </div>
              <div>
                <p className="font-display text-lg font-bold text-[#111827]">
                  {supplier.business_name}
                </p>
                {supplier.supplier_categories ? (
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                    {supplier.supplier_categories.name}
                  </p>
                ) : null}
              </div>
              {supplier.description ? (
                <p className="line-clamp-3 text-sm text-[#4b5563]">
                  {supplier.description}
                </p>
              ) : null}
              <div className="mt-auto flex items-center justify-between border-t border-[#e5e7eb] pt-3">
                <span className="text-sm font-bold text-[#111827]">
                  {supplier.base_price
                    ? formatPeso(supplier.base_price)
                    : "Contact for price"}
                </span>
                {supplier.price_unit ? (
                  <span className="text-xs text-[#6b7280]">
                    {supplier.price_unit.replace(/_/g, " ")}
                  </span>
                ) : null}
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="storefront"
          title="No suppliers found"
          description="Try a different search term or category. Only accredited suppliers appear in this directory."
        />
      )}
    </DashboardSubPage>
  );
}
