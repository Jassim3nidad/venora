import { Suspense } from "react";
import CatalogSkeleton from "@/features/storefront/ui/catalog/CatalogSkeleton";
import CatalogGrid from "@/features/storefront/ui/catalog/CatalogGrid";
import CatalogSidebar from "@/features/storefront/ui/catalog/CatalogSidebar";
import CatalogSort from "@/features/storefront/ui/catalog/CatalogSort";
import CatalogEmptyState from "@/features/storefront/ui/catalog/CatalogEmptyState";
import { getStorefrontProducts, getStorefrontCategories, ProductAvailability } from "@/features/storefront/data/catalog-queries";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Shop | 7TH SOUTH STREET",
  description: "Browse the latest premium streetwear collections from 7TH SOUTH STREET.",
};

export const dynamic = "force-dynamic";

export default async function ShopPage(props: {
  searchParams?: Promise<{
    category?: string;
    availability?: string;
    sort?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const category = searchParams?.category;
  const availability = searchParams?.availability as ProductAvailability;
  const sort = searchParams?.sort as "newest" | "price_asc" | "price_desc";
  const query = searchParams?.q;
  const page = searchParams?.page ? parseInt(searchParams.page) : 1;

  const supabase = await createClient();

  // Fetch categories for sidebar
  const { data: categories } = await getStorefrontCategories(supabase);

  // Fetch products
  const { data: products, error } = await getStorefrontProducts(supabase, {
    category,
    availability,
    sort,
    query,
    page,
  });

  if (error) {
    throw new Error("Failed to load catalog data");
  }

  return (
    <div className="w-full flex-1 bg-base">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 lg:px-8">
        <div className="mb-12 flex flex-col justify-between gap-6 border-b border-border pb-6 md:flex-row md:items-end">
          <div>
            <h1 className="font-display text-4xl font-black uppercase tracking-widest text-text-primary md:text-5xl">
              The Archive
            </h1>
            <p className="mt-2 text-sm font-bold uppercase tracking-[0.2em] text-text-secondary">
              Premium Streetwear Catalog
            </p>
          </div>
          <CatalogSort />
        </div>

        <div className="flex flex-col gap-12 md:flex-row">
          <CatalogSidebar 
            categories={categories || []} 
            currentCategory={category} 
            currentAvailability={availability} 
          />
          
          <div className="flex-1">
            {(!products || products.length === 0) ? (
              <CatalogEmptyState />
            ) : (
              <CatalogGrid products={products} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
