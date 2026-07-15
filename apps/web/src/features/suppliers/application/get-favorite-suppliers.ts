import { createClient } from "@/lib/supabase/server";
import { mapDbSupplier, type VenoraSupabase } from "./queries";
import type { SupplierMarketplaceProfile } from "../types/supplier.types";

const SUPPLIER_FAVORITE_SELECT = `
  id,
  profile_id,
  business_name,
  slug,
  category_id,
  headline,
  description,
  base_price,
  price_unit,
  service_areas,
  coverage_radius_km,
  contact_email,
  contact_phone,
  website_url,
  instagram_url,
  profile_image_url,
  hero_image_url,
  response_time_hours,
  years_in_business,
  team_size,
  minimum_booking_notice_days,
  is_featured,
  accreditation_status,
  avg_rating,
  review_count,
  created_at,
  supplier_categories(id, name, slug),
  supplier_services(
    id,
    supplier_id,
    name,
    description,
    price,
    price_unit,
    package_type,
    inclusions,
    min_guests,
    max_guests,
    is_active,
    sort_order
  ),
  supplier_portfolio_items(
    id,
    supplier_id,
    title,
    description,
    image_url,
    event_type,
    city,
    province,
    event_date,
    is_featured,
    sort_order
  ),
  supplier_reviews(
    id,
    supplier_id,
    overall_rating,
    comment,
    created_at,
    profiles(full_name, avatar_url)
  )
`;

export async function isSupplierFavoritedByUser(
  supabase: VenoraSupabase,
  userId: string,
  supplierId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("supplier_favorites")
    .select("customer_id")
    .eq("customer_id", userId)
    .eq("supplier_id", supplierId)
    .maybeSingle();

  return Boolean(data);
}

export async function getFavoriteSuppliersForUser(
  userId: string,
): Promise<SupplierMarketplaceProfile[]> {
  const supabase = (await createClient()) as VenoraSupabase;

  const { data: favoriteRows, error: favoritesError } = await supabase
    .from("supplier_favorites")
    .select("supplier_id, created_at")
    .eq("customer_id", userId)
    .order("created_at", { ascending: false });

  if (favoritesError) {
    console.error(
      "[suppliers] favorite suppliers fetch failed:",
      favoritesError.message,
    );
    return [];
  }

  const supplierIds = (favoriteRows ?? []).map((row: any) =>
    String(row.supplier_id),
  );

  if (supplierIds.length === 0) return [];

  const { data: suppliers, error: suppliersError } = await supabase
    .from("supplier_profiles")
    .select(SUPPLIER_FAVORITE_SELECT)
    .in("id", supplierIds)
    .eq("accreditation_status", "accredited");

  if (suppliersError) {
    console.error(
      "[suppliers] favorite supplier profiles fetch failed:",
      suppliersError.message,
    );
    return [];
  }

  const supplierMap = new Map(
    (suppliers ?? []).map((row: any) => [String(row.id), mapDbSupplier(row)]),
  );

  return supplierIds
    .map((id: string) => supplierMap.get(id))
    .filter(
      (
        supplier: SupplierMarketplaceProfile | undefined,
      ): supplier is SupplierMarketplaceProfile => Boolean(supplier),
    );
}

export async function getFavoriteSupplierIdsForUser(
  userId: string,
): Promise<Set<string>> {
  const supabase = (await createClient()) as VenoraSupabase;

  const { data, error } = await supabase
    .from("supplier_favorites")
    .select("supplier_id")
    .eq("customer_id", userId);

  if (error) {
    console.error(
      "[suppliers] favorite supplier ids fetch failed:",
      error.message,
    );
    return new Set();
  }

  return new Set((data ?? []).map((row: any) => String(row.supplier_id)));
}
