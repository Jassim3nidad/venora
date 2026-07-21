import { SupabaseClient } from "@supabase/supabase-js";

export type ProductStatus = "draft" | "published" | "archived";
export type ProductAvailability = "available" | "sold_out" | "coming_soon";

export interface CatalogProduct {
  id: string;
  title: string;
  slug: string;
  base_price: number;
  category_name: string | null;
  availability: ProductAvailability;
  primary_image_url: string | null;
  is_new: boolean;
  total_stock: number;
}

export interface CatalogCategory {
  id: string;
  name: string;
  slug: string;
}

export interface SearchCatalogParams {
  query?: string;
  category?: string;
  availability?: ProductAvailability;
  sort?: "newest" | "price_asc" | "price_desc";
  page?: number;
  limit?: number;
}

export async function getStorefrontProducts(
  supabase: SupabaseClient,
  params: SearchCatalogParams
): Promise<{ data: CatalogProduct[] | null; error: Error | null }> {
  try {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 12;
    const offset = (page - 1) * limit;

    const { data, error } = await supabase.rpc("search_published_products", {
      search_query: params.query || null,
      category_slug: params.category || null,
      availability_filter: params.availability || null,
      sort_by: params.sort || "newest",
      page_limit: limit,
      page_offset: offset,
    });

    if (error) {
      console.error("[catalog-queries] search_published_products error:", error);
      return { data: null, error };
    }

    return { data: data as CatalogProduct[], error: null };
  } catch (error) {
    console.error("[catalog-queries] Unexpected error:", error);
    return { data: null, error: error as Error };
  }
}

export async function getStorefrontCategories(
  supabase: SupabaseClient
): Promise<{ data: CatalogCategory[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from("product_categories")
      .select("id, name, slug")
      .order("name", { ascending: true });

    if (error) {
      console.error("[catalog-queries] fetch categories error:", error);
      return { data: null, error };
    }

    return { data: data as CatalogCategory[], error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}
