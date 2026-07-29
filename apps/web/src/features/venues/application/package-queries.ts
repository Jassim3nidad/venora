import { createClient } from "@/lib/supabase/server";

export type EligibleSupplier = {
  supplier_id: string;
  business_name: string;
  category_name: string | null;
  province: string | null;
  avg_rating: number;
  review_count: number;
  slug: string | null;
  profile_image_url: string | null;
  // From the active agreement
  agreement_id: string;
  supplier_base_rate: number;
  venue_markup_fee: number;
  custom_service_name: string | null;
  max_guest_count: number | null;
  // First active service for display
  service_name: string | null;
};

/**
 * Returns suppliers eligible to be added to a package for a given venue.
 *
 * Eligibility requires ALL of:
 * 1. Supplier is `accredited`
 * 2. Active `venue_suppliers` row for this venue (status = 'active')
 * 3. Active `venue_supplier_agreements` row for this venue (status = 'active')
 * 4. Supplier has at least one active `supplier_services` row
 *
 * Optionally filtered by guest capacity (max_guest_count >= required if set).
 */
export async function getEligiblePackageSuppliers(
  venueId: string,
  requiredGuestCapacity?: number
): Promise<EligibleSupplier[]> {
  const supabase = (await createClient()) as any;

  const [{ data, error }, { data: activePartners, error: partnersError }] =
    await Promise.all([
      supabase
        .from("venue_supplier_agreements")
        .select(
          `
      id,
      supplier_base_rate,
      venue_markup_fee,
      custom_service_name,
      max_guest_count,
      supplier_id,
      supplier_profiles!inner (
        id,
        business_name,
        accreditation_status,
        avg_rating,
        review_count,
        slug,
        profile_image_url,
        province,
        supplier_categories ( name ),
        supplier_services ( id, name )
      )
    `,
        )
        .eq("venue_id", venueId)
        .eq("status", "active"),
      supabase
        .from("venue_suppliers")
        .select("supplier_id")
        .eq("venue_id", venueId)
        .eq("status", "active"),
    ]);

  if (error) {
    console.error("[getEligiblePackageSuppliers] query error:", error.message);
    return [];
  }

  if (partnersError) {
    console.error(
      "[getEligiblePackageSuppliers] partners error:",
      partnersError.message,
    );
    return [];
  }

  const activePartnerIds = new Set(
    (activePartners ?? []).map((row: { supplier_id: string }) => row.supplier_id),
  );

  const rows = (data ?? []) as any[];

  return rows
    .filter((row) => {
      const sp = row.supplier_profiles;
      if (!sp) return false;
      if (!activePartnerIds.has(row.supplier_id ?? sp.id)) return false;
      if (sp.accreditation_status !== "accredited") return false;
      if (
        requiredGuestCapacity &&
        row.max_guest_count &&
        row.max_guest_count < requiredGuestCapacity
      ) {
        return false;
      }
      return true;
    })
    .map((row) => {
      const sp = row.supplier_profiles;
      return {
        supplier_id: sp.id,
        business_name: sp.business_name,
        category_name: sp.supplier_categories?.name ?? null,
        province: sp.province ?? null,
        avg_rating: sp.avg_rating ?? 0,
        review_count: sp.review_count ?? 0,
        slug: sp.slug ?? null,
        profile_image_url: sp.profile_image_url ?? null,
        agreement_id: row.id,
        supplier_base_rate: Number(row.supplier_base_rate),
        venue_markup_fee: Number(row.venue_markup_fee),
        custom_service_name: row.custom_service_name ?? null,
        max_guest_count: row.max_guest_count ?? null,
        service_name: sp.supplier_services?.[0]?.name ?? null,
      } satisfies EligibleSupplier;
    });
}
export async function getPackageForEditing(packageId: string) {
  const supabase = (await createClient()) as any;

  const { data: pkg, error } = await supabase
    .from("venue_packages")
    .select(`
      id,
      venue_id,
      name,
      description,
      event_type_id,
      min_guests,
      max_guests,
      price,
      price_unit,
      deposit_percentage,
      deposit_flat_amount,
      valid_from,
      valid_until,
      amenity_ids,
      venue_rules,
      inclusions,
      is_active,
      package_suppliers (
        supplier_id,
        agreement_id,
        included_price
      )
    `)
    .eq("id", packageId)
    .single();

  if (error || !pkg) return null;
  return pkg;
}
