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

const SUPPLIER_PROFILE_SELECT = `
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
  latitude,
  longitude,
  business_location_type,
  location_visibility,
  public_location_label,
  travel_available,
  travel_fee_note,
  city,
  province
`;

const SUPPLIER_SERVICE_SELECT = `
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
`;

export const SUPPLIER_PORTFOLIO_SELECT = `
  id,
  supplier_id,
  title,
  description,
  image_url,
  image_urls,
  event_type,
  city,
  province,
  venue_name,
  event_date,
  is_featured,
  sort_order,
  status,
  service_id
`;

const SUPPLIER_REVIEW_SELECT = `
  id,
  supplier_id,
  overall_rating,
  comment,
  created_at
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
    .map((item) => {
      // Prefer the proper image_urls array column (migration 070), fall back to parsing image_url
      const imageUrls: string[] = Array.isArray(item.image_urls) && item.image_urls.length > 0
        ? item.image_urls
        : item.image_url
          ? String(item.image_url).split(",").map((s: string) => s.trim()).filter(Boolean)
          : [];
      const mainImageUrl = imageUrls.length > 0 ? imageUrls[0] : null;

      return {
        id: String(item.id),
        supplierId: String(item.supplier_id),
        title: item.title ? String(item.title) : null,
        description: item.description ?? null,
        imageUrl: mainImageUrl ?? null,
        imageUrls: imageUrls,
        eventType: item.event_type ?? null,
        city: item.city ?? null,
        province: item.province ?? null,
        venueName: item.venue_name ?? null,
        eventDate: item.event_date ?? null,
        isFeatured: item.is_featured ?? false,
        sortOrder: item.sort_order ?? 0,
        status: (item.status ?? "published") as "draft" | "hidden" | "published",
        serviceId: item.service_id ?? null,
      };
    })
    .sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      return a.sortOrder - b.sortOrder || (a.title || "").localeCompare(b.title || "");
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

function groupBySupplierId<T extends { supplier_id?: string | null }>(
  rows: T[] | null | undefined,
): Record<string, T[]> {
  return (rows ?? []).reduce<Record<string, T[]>>((acc, row) => {
    if (!row.supplier_id) return acc;

    const supplierId = String(row.supplier_id);
    acc[supplierId] = acc[supplierId] ?? [];
    acc[supplierId].push(row);

    return acc;
  }, {});
}

function attachSupplierRelations(
  rows: any[],
  categories: SupplierCategory[],
  services: any[] = [],
  portfolioItems: any[] = [],
  reviews: any[] = [],
) {
  const servicesBySupplierId = groupBySupplierId(services);
  const portfolioBySupplierId = groupBySupplierId(portfolioItems);
  const reviewsBySupplierId = groupBySupplierId(reviews);

  return rows.map((row) => {
    const supplierId = String(row.id);
    const category =
      categories.find((item) => item.id === String(row.category_id)) ?? null;

    return {
      ...row,
      supplier_categories: category,
      supplier_services: servicesBySupplierId[supplierId] ?? [],
      supplier_portfolio_items: portfolioBySupplierId[supplierId] ?? [],
      supplier_reviews: reviewsBySupplierId[supplierId] ?? [],
    };
  });
}

async function getSupplierRelations(
  supabase: VenoraSupabase,
  supplierIds: string[],
) {
  if (supplierIds.length === 0) {
    return {
      services: [],
      portfolioItems: [],
      reviews: [],
    };
  }

  const [servicesResult, portfolioResult, reviewsResult] = await Promise.all([
    supabase
      .from("supplier_services")
      .select(SUPPLIER_SERVICE_SELECT)
      .in("supplier_id", supplierIds)
      .order("sort_order", { ascending: true }),

    supabase
      .from("supplier_portfolio_items")
      .select(SUPPLIER_PORTFOLIO_SELECT)
      .in("supplier_id", supplierIds)
      .order("is_featured", { ascending: false })
      .order("sort_order", { ascending: true }),

    supabase
      .from("supplier_reviews")
      .select(SUPPLIER_REVIEW_SELECT)
      .in("supplier_id", supplierIds)
      .order("created_at", { ascending: false }),
  ]);

  if (servicesResult.error) {
    console.error("[suppliers] services fetch failed:", servicesResult.error.message);
  }

  if (portfolioResult.error) {
    console.error("[suppliers] portfolio fetch failed:", portfolioResult.error.message);
  }

  if (reviewsResult.error) {
    console.error("[suppliers] reviews fetch failed:", reviewsResult.error.message);
  }

  return {
    services: servicesResult.data ?? [],
    portfolioItems: portfolioResult.data ?? [],
    reviews: reviewsResult.data ?? [],
  };
}

export function mapDbSupplier(row: any): SupplierMarketplaceProfile {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    businessName: String(row.business_name),
    slug: row.slug ? String(row.slug) : String(row.id),
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
    accreditationStatus: row.accreditation_status ?? "pending",
    avgRating: Number(row.avg_rating) || 0,
    reviewCount: Number(row.review_count) || 0,
    createdAt: row.created_at ? String(row.created_at) : new Date().toISOString(),
    // Location fields (migration 071)
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    businessLocationType: row.business_location_type ?? null,
    locationVisibility: row.location_visibility ?? null,
    publicLocationLabel: row.public_location_label ?? null,
    travelAvailable: row.travel_available ?? false,
    travelFeeNote: row.travel_fee_note ?? null,
    city: row.city ?? null,
    province: row.province ?? null,
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

  return data.map((category: any) => ({
    id: String(category.id),
    name: String(category.name),
    slug: String(category.slug),
  }));
}

export async function getPublicSupplierList(
  supabase: VenoraSupabase,
): Promise<SupplierListResult> {
  const [categories, suppliersResult] = await Promise.all([
    getSupplierCategories(supabase),
    supabase
      .from("supplier_profiles")
      .select(SUPPLIER_PROFILE_SELECT)
      .eq("accreditation_status", "accredited")
      .order("avg_rating", { ascending: false })
      .order("business_name", { ascending: true }),
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

  const supplierRows = suppliersResult.data ?? [];
  const supplierIds = supplierRows.map((supplier: any) => String(supplier.id));
  const { services, portfolioItems, reviews } = await getSupplierRelations(
    supabase,
    supplierIds,
  );

  const suppliersWithRelations = attachSupplierRelations(
    supplierRows,
    categories,
    services,
    portfolioItems,
    reviews,
  );

  return {
    categories,
    suppliers: suppliersWithRelations.map(mapDbSupplier),
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
  const categories = await getSupplierCategories(supabase);

  let query = supabase
    .from("supplier_profiles")
    .select(SUPPLIER_PROFILE_SELECT)
    .eq("accreditation_status", "accredited");

  if (isUuid(identifier)) {
    query = query.eq("id", identifier);
  } else {
    query = query.eq("slug", identifier);
  }

  const { data, error } = await query.maybeSingle();

  if (!error && data) {
    const { services, portfolioItems, reviews } = await getSupplierRelations(
      supabase,
      [String(data.id)],
    );

    const [supplierWithRelations] = attachSupplierRelations(
      [data],
      categories,
      services,
      portfolioItems,
      reviews,
    );

    return mapDbSupplier(supplierWithRelations);
  }

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
      .select(SUPPLIER_PROFILE_SELECT)
      .eq("profile_id", userId)
      .maybeSingle(),
  ]);

  if (profileResult.error) {
    console.error("[suppliers] dashboard profile fetch failed:", profileResult.error.message);
  }

  if (!profileResult.data) {
    return {
      categories,
      profile: null,
    };
  }

  const { services, portfolioItems, reviews } = await getSupplierRelations(
    supabase,
    [String(profileResult.data.id)],
  );

  const [supplierWithRelations] = attachSupplierRelations(
    [profileResult.data],
    categories,
    services,
    portfolioItems,
    reviews,
  );

  return {
    categories,
    profile: mapDbSupplier(supplierWithRelations),
  };
}
