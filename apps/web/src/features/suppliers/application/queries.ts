import {
  sampleSupplierCategories,
  sampleSuppliers,
} from "../data/sample-suppliers";
import type {
  SupplierCategory,
  SupplierDashboardContext,
  SupplierListResult,
  SupplierMarketplaceProfile,
  SupplierPackage,
  SupplierPortfolioItem,
  SupplierReview,
} from "../types/supplier.types";
export {
  getSupplierHeroImage,
  getSupplierStartingPrice,
} from "../utils/supplier-derive";

type VenoraSupabase = any;
export type { VenoraSupabase };

const SUPPLIER_SELECT = `
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

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function normalizeCategory(row: any): SupplierCategory | null {
  const category = firstRelation(row?.supplier_categories);
  if (!category) return null;

  return {
    id: String(category.id),
    name: String(category.name),
    slug: String(category.slug),
  };
}

function normalizePackages(rows: any[] | null | undefined): SupplierPackage[] {
  return (rows ?? [])
    .map((service) => ({
      id: String(service.id),
      supplierId: String(service.supplier_id),
      name: String(service.name),
      description: service.description ?? null,
      price: service.price === null ? null : Number(service.price),
      priceUnit: service.price_unit ?? null,
      packageType: service.package_type ?? "standard",
      inclusions: Array.isArray(service.inclusions) ? service.inclusions : [],
      minGuests: service.min_guests ?? null,
      maxGuests: service.max_guests ?? null,
      isActive: service.is_active ?? true,
      sortOrder: service.sort_order ?? 0,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

function normalizePortfolio(rows: any[] | null | undefined): SupplierPortfolioItem[] {
  return (rows ?? [])
    .map((item) => ({
      id: String(item.id),
      supplierId: String(item.supplier_id),
      title: String(item.title),
      description: item.description ?? null,
      imageUrl: String(item.image_url),
      eventType: item.event_type ?? null,
      city: item.city ?? null,
      province: item.province ?? null,
      eventDate: item.event_date ?? null,
      isFeatured: item.is_featured ?? false,
      sortOrder: item.sort_order ?? 0,
    }))
    .sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      return a.sortOrder - b.sortOrder || a.title.localeCompare(b.title);
    });
}

function normalizeReviews(rows: any[] | null | undefined): SupplierReview[] {
  return (rows ?? []).map((review) => {
    const profile = firstRelation(review.profiles);

    return {
      id: String(review.id),
      supplierId: String(review.supplier_id),
      overallRating: Number(review.overall_rating) || 0,
      comment: review.comment ?? null,
      createdAt: String(review.created_at),
      customerName: profile?.full_name ?? "Verified client",
      customerAvatarUrl: profile?.avatar_url ?? null,
    };
  });
}

export function mapDbSupplier(row: any): SupplierMarketplaceProfile {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    businessName: String(row.business_name),
    slug: String(row.slug),
    category: normalizeCategory(row),
    headline: row.headline ?? null,
    description: row.description ?? null,
    basePrice: row.base_price === null ? null : Number(row.base_price),
    priceUnit: row.price_unit ?? null,
    serviceAreas: Array.isArray(row.service_areas) ? row.service_areas : [],
    coverageRadiusKm: row.coverage_radius_km ?? null,
    contactEmail: row.contact_email ?? null,
    contactPhone: row.contact_phone ?? null,
    websiteUrl: row.website_url ?? null,
    instagramUrl: row.instagram_url ?? null,
    profileImageUrl: row.profile_image_url ?? null,
    heroImageUrl: row.hero_image_url ?? null,
    responseTimeHours: row.response_time_hours ?? 24,
    yearsInBusiness: row.years_in_business ?? null,
    teamSize: row.team_size ?? null,
    minimumBookingNoticeDays: row.minimum_booking_notice_days ?? 14,
    isFeatured: Boolean(row.is_featured),
    accreditationStatus: row.accreditation_status,
    avgRating: Number(row.avg_rating) || 0,
    reviewCount: Number(row.review_count) || 0,
    createdAt: String(row.created_at),
    packages: normalizePackages(row.supplier_services),
    portfolio: normalizePortfolio(row.supplier_portfolio_items),
    reviews: normalizeReviews(row.supplier_reviews),
  };
}

export async function getSupplierCategories(
  supabase: VenoraSupabase,
): Promise<SupplierCategory[]> {
  const { data, error } = await supabase
    .from("supplier_categories")
    .select("id, name, slug")
    .order("name", { ascending: true });

  if (error || !data || data.length === 0) {
    if (error) console.error("[suppliers] categories fetch failed:", error.message);
    return sampleSupplierCategories;
  }

  return (data as SupplierCategory[]).map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
  }));
}

export async function getPublicSupplierList(
  supabase: VenoraSupabase,
): Promise<SupplierListResult> {
  const [categories, suppliersResult] = await Promise.all([
    getSupplierCategories(supabase),
    supabase
      .from("supplier_profiles")
      .select(SUPPLIER_SELECT)
      .eq("accreditation_status", "accredited")
      .order("is_featured", { ascending: false })
      .order("avg_rating", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  if (suppliersResult.error || !suppliersResult.data?.length) {
    if (suppliersResult.error) {
      console.error(
        "[suppliers] public list fetch failed:",
        suppliersResult.error.message,
      );
    }

    return {
      categories,
      suppliers: sampleSuppliers,
    };
  }

  return {
    categories,
    suppliers: suppliersResult.data.map(mapDbSupplier),
  };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(
    value,
  );
}

export async function getPublicSupplierBySlug(
  supabase: VenoraSupabase,
  identifier: string,
): Promise<SupplierMarketplaceProfile | null> {
  const query = supabase
    .from("supplier_profiles")
    .select(SUPPLIER_SELECT)
    .eq("accreditation_status", "accredited");

  const { data, error } = await (isUuid(identifier)
    ? query.eq("id", identifier)
    : query.eq("slug", identifier)
  ).maybeSingle();

  if (!error && data) return mapDbSupplier(data);

  if (error) {
    console.error("[suppliers] detail fetch failed:", error.message);
  }

  return (
    sampleSuppliers.find(
      (supplier) =>
        supplier.slug === identifier ||
        supplier.id === identifier,
    ) ?? null
  );
}

export async function getSupplierDashboardContext(
  supabase: VenoraSupabase,
  userId: string,
): Promise<SupplierDashboardContext> {
  const [categories, profileResult] = await Promise.all([
    getSupplierCategories(supabase),
    supabase
      .from("supplier_profiles")
      .select(SUPPLIER_SELECT)
      .eq("profile_id", userId)
      .maybeSingle(),
  ]);

  if (profileResult.error) {
    console.error("[suppliers] dashboard profile fetch failed:", profileResult.error.message);
  }

  return {
    categories,
    profile: profileResult.data ? mapDbSupplier(profileResult.data) : null,
  };
}
