import { createClient } from "@/lib/supabase/server";

export type VenueQueueFilter = "pending" | "published" | "suspended" | "all";

export type VenueQueueRow = {
  id: string;
  name: string;
  city: string | null;
  province: string | null;
  status: string;
  createdAt: string;
  organizationName: string | null;
};

const STATUS_FOR_FILTER: Record<VenueQueueFilter, string[] | null> = {
  pending: ["pending_approval"],
  published: ["published"],
  suspended: ["suspended"],
  all: null,
};

export async function getVenuesForAdminReview(filter: VenueQueueFilter = "pending"): Promise<{
  venues: VenueQueueRow[] | null;
  error: string | null;
}> {
  const supabase = (await createClient()) as any;

  let query = supabase
    .from("venues")
    .select("id, name, city, province, status, created_at, organizations(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  const statuses = STATUS_FOR_FILTER[filter];
  if (statuses) query = query.in("status", statuses);

  const { data, error } = await query;
  if (error) return { venues: null, error: error.message };

  const venues: VenueQueueRow[] = (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    city: row.city,
    province: row.province,
    status: row.status,
    createdAt: row.created_at,
    organizationName: row.organizations?.name ?? null,
  }));

  return { venues, error: null };
}

export type VenueReviewDetail = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  address: string;
  city: string | null;
  province: string | null;
  municipality: string | null;
  latitude: number | null;
  longitude: number | null;
  capacityMin: number | null;
  capacityMax: number;
  basePrice: number;
  priceUnit: string;
  cancellationPolicy: string | null;
  venueRules: string | null;
  organizationName: string | null;
  ownerName: string | null;
  images: { id: string; storagePath: string; mediaType: string; isFeatured: boolean }[];
  packages: { id: string; name: string; price: number; priceUnit: string }[];
  amenities: string[];
  eventTypes: string[];
};

export async function getVenueForAdminReview(venueId: string): Promise<{
  venue: VenueReviewDetail | null;
  error: string | null;
}> {
  const supabase = (await createClient()) as any;

  const { data: venue, error } = await supabase
    .from("venues")
    .select(
      `
      id, name, description, status, address, city, province, municipality,
      latitude, longitude, capacity_min, capacity_max, base_price, price_unit,
      cancellation_policy, venue_rules,
      organizations ( name, profiles!owner_id ( full_name ) ),
      venue_images ( id, storage_path, media_type, is_featured ),
      venue_packages ( id, name, price, price_unit ),
      venue_amenities ( amenities ( name ) ),
      venue_event_types ( event_types ( name ) )
    `,
    )
    .eq("id", venueId)
    .maybeSingle();

  if (error) return { venue: null, error: error.message };
  if (!venue) return { venue: null, error: "Venue not found" };

  const org = Array.isArray(venue.organizations) ? venue.organizations[0] : venue.organizations;
  const ownerProfile = Array.isArray(org?.profiles) ? org?.profiles[0] : org?.profiles;

  return {
    venue: {
      id: venue.id,
      name: venue.name,
      description: venue.description,
      status: venue.status,
      address: venue.address,
      city: venue.city,
      province: venue.province,
      municipality: venue.municipality,
      latitude: venue.latitude,
      longitude: venue.longitude,
      capacityMin: venue.capacity_min,
      capacityMax: venue.capacity_max,
      basePrice: Number(venue.base_price),
      priceUnit: venue.price_unit,
      cancellationPolicy: venue.cancellation_policy,
      venueRules: venue.venue_rules,
      organizationName: org?.name ?? null,
      ownerName: ownerProfile?.full_name ?? null,
      images: (venue.venue_images ?? []).map((img: any) => ({
        id: img.id,
        storagePath: img.storage_path,
        mediaType: img.media_type,
        isFeatured: img.is_featured,
      })),
      packages: (venue.venue_packages ?? []).map((pkg: any) => ({
        id: pkg.id,
        name: pkg.name,
        price: Number(pkg.price),
        priceUnit: pkg.price_unit,
      })),
      amenities: (venue.venue_amenities ?? []).map((a: any) => a.amenities?.name).filter(Boolean),
      eventTypes: (venue.venue_event_types ?? []).map((e: any) => e.event_types?.name).filter(Boolean),
    },
    error: null,
  };
}

export type VenueReviewHistoryEntry = {
  id: string;
  action: string;
  previousStatus: string | null;
  newStatus: string | null;
  reason: string | null;
  actorName: string | null;
  createdAt: string;
};

export async function getVenueReviewHistory(venueId: string): Promise<{
  history: VenueReviewHistoryEntry[] | null;
  error: string | null;
}> {
  const supabase = (await createClient()) as any;

  const { data, error } = await supabase
    .from("venue_review_history")
    .select("id, action, previous_status, new_status, reason, created_at, profiles:actor_id (full_name)")
    .eq("venue_id", venueId)
    .order("created_at", { ascending: false });

  if (error) return { history: null, error: error.message };

  const history: VenueReviewHistoryEntry[] = (data ?? []).map((row: any) => ({
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
