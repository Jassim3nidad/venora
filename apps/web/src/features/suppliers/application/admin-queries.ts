import { createClient } from "@/lib/supabase/server";

export type SupplierQueueFilter = "pending" | "accredited" | "suspended" | "rejected" | "all";

export type SupplierQueueRow = {
  id: string;
  businessName: string;
  status: string;
  avgRating: number;
  reviewCount: number;
  createdAt: string;
};

const STATUS_FOR_FILTER: Record<SupplierQueueFilter, string[] | null> = {
  pending: ["pending"],
  accredited: ["accredited"],
  suspended: ["suspended"],
  rejected: ["rejected"],
  all: null,
};

export async function getSuppliersForAdminReview(filter: SupplierQueueFilter = "pending"): Promise<{
  suppliers: SupplierQueueRow[] | null;
  error: string | null;
}> {
  const supabase = (await createClient()) as any;

  let query = supabase
    .from("supplier_profiles")
    .select("id, business_name, accreditation_status, avg_rating, review_count, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const statuses = STATUS_FOR_FILTER[filter];
  if (statuses) query = query.in("accreditation_status", statuses);

  const { data, error } = await query;
  if (error) return { suppliers: null, error: error.message };

  const suppliers: SupplierQueueRow[] = (data ?? []).map((row: any) => ({
    id: row.id,
    businessName: row.business_name,
    status: row.accreditation_status,
    avgRating: Number(row.avg_rating),
    reviewCount: row.review_count,
    createdAt: row.created_at,
  }));

  return { suppliers, error: null };
}

export type SupplierReviewDetail = {
  id: string;
  businessName: string;
  status: string;
  categoryName: string | null;
  description: string | null;
  headline: string | null;
  serviceAreas: string[];
  coverageRadiusKm: number | null;
  contactEmail: string | null;
  contactPhone: string | null;
  websiteUrl: string | null;
  basePrice: number | null;
  priceUnit: string | null;
  cancellationPolicy: string | null;
  ownerName: string | null;
  services: { id: string; name: string; price: number | null; priceUnit: string | null }[];
  portfolio: { id: string; title: string; imageUrl: string }[];
};

export async function getSupplierForAdminReview(supplierId: string): Promise<{
  supplier: SupplierReviewDetail | null;
  error: string | null;
}> {
  const supabase = (await createClient()) as any;

  const { data: supplier, error } = await supabase
    .from("supplier_profiles")
    .select(
      `
      id, business_name, accreditation_status, description, headline,
      service_areas, coverage_radius_km, contact_email, contact_phone,
      website_url, base_price, price_unit, cancellation_policy,
      supplier_categories ( name ),
      profiles!profile_id ( full_name ),
      supplier_services ( id, name, price, price_unit ),
      supplier_portfolio_items ( id, title, image_url )
    `,
    )
    .eq("id", supplierId)
    .maybeSingle();

  if (error) return { supplier: null, error: error.message };
  if (!supplier) return { supplier: null, error: "Supplier not found" };

  const category = Array.isArray(supplier.supplier_categories)
    ? supplier.supplier_categories[0]
    : supplier.supplier_categories;
  const owner = Array.isArray(supplier.profiles) ? supplier.profiles[0] : supplier.profiles;

  return {
    supplier: {
      id: supplier.id,
      businessName: supplier.business_name,
      status: supplier.accreditation_status,
      categoryName: category?.name ?? null,
      description: supplier.description,
      headline: supplier.headline,
      serviceAreas: supplier.service_areas ?? [],
      coverageRadiusKm: supplier.coverage_radius_km,
      contactEmail: supplier.contact_email,
      contactPhone: supplier.contact_phone,
      websiteUrl: supplier.website_url,
      basePrice: supplier.base_price !== null ? Number(supplier.base_price) : null,
      priceUnit: supplier.price_unit,
      cancellationPolicy: supplier.cancellation_policy,
      ownerName: owner?.full_name ?? null,
      services: (supplier.supplier_services ?? []).map((s: any) => ({
        id: s.id,
        name: s.name,
        price: s.price !== null ? Number(s.price) : null,
        priceUnit: s.price_unit,
      })),
      portfolio: (supplier.supplier_portfolio_items ?? []).map((p: any) => ({
        id: p.id,
        title: p.title,
        imageUrl: p.image_url,
      })),
    },
    error: null,
  };
}

export type SupplierReviewHistoryEntry = {
  id: string;
  action: string;
  previousStatus: string | null;
  newStatus: string | null;
  reason: string | null;
  actorName: string | null;
  createdAt: string;
};

export async function getSupplierReviewHistory(supplierId: string): Promise<{
  history: SupplierReviewHistoryEntry[] | null;
  error: string | null;
}> {
  const supabase = (await createClient()) as any;

  const { data, error } = await supabase
    .from("supplier_review_history")
    .select("id, action, previous_status, new_status, reason, created_at, profiles:actor_id (full_name)")
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false });

  if (error) return { history: null, error: error.message };

  const history: SupplierReviewHistoryEntry[] = (data ?? []).map((row: any) => ({
    id: row.id,
    action: row.action,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    reason: row.reason,
    actorName: row.profiles?.full_name ?? null,
    createdAt: row.created_at,
  }));

  return { history, error: null };
}
