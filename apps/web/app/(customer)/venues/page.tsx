import { createClient } from "@/lib/supabase/server";
import VenuesMarketplaceClient, { type Venue } from "@/components/venues/VenuesMarketplaceClient";

export const dynamic = "force-dynamic";

export default async function VenuesPage() {
  const supabase = await createClient();

  const { data: dbVenues, error } = await (supabase.from("venues") as any)
    .select(`
      *,
      venue_images(storage_path, is_featured),
      venue_category_assignments(venue_categories(name, slug)),
      venue_event_types(event_types(name, slug)),
      venue_amenities(amenities(name))
    `)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[venues/page] Supabase fetch error:", error.message);
  }

  // Format database venues
  const venues: Venue[] = ((dbVenues as any) ?? []).map((venue: any) => {
    const images: { storage_path: string; is_featured: boolean }[] = venue.venue_images ?? [];
    const featuredImage = images.find((img) => img.is_featured) ?? images[0];
    const firstImage = featuredImage?.storage_path;
    const cover_image = firstImage
      ? (firstImage.startsWith("http")
          ? firstImage
          : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/venue-images/${firstImage}`)
      : "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80";

    const eventTypes = venue.venue_event_types?.map((et: any) => et.event_types?.name).filter(Boolean) ?? [];
    const categories = venue.venue_category_assignments?.map((ca: any) => ca.venue_categories?.slug).filter(Boolean) ?? [];
    const amenities = venue.venue_amenities?.map((va: any) => va.amenities?.name).filter(Boolean) ?? [];

    return {
      id: venue.id,
      slug: venue.slug ?? String(venue.id),
      name: venue.name ?? "Untitled Venue",
      location:
        venue.city && venue.province
          ? `${venue.city}, ${venue.province}`
          : venue.city || venue.province || "Location unavailable",
      price: formatCurrency(venue.base_price),
      capacity: venue.capacity_max
        ? `Up to ${venue.capacity_max} pax`
        : "Capacity unavailable",
      image: cover_image,
      rating: Number(venue.avg_rating || 4.8),
      category: venue.venue_category_assignments?.[0]?.venue_categories?.name ?? "Event Venue",
      base_price: Number(venue.base_price),
      capacity_max: venue.capacity_max,
      province: venue.province,
      city: venue.city,
      indoor_outdoor: venue.indoor_outdoor,
      air_conditioned: venue.air_conditioned,
      parking_available: venue.parking_available,
      overnight_accommodation: venue.overnight_accommodation,
      pet_friendly: venue.pet_friendly,
      wheelchair_accessible: venue.wheelchair_accessible,
      has_pool: venue.has_pool,
      eventTypes,
      categories,
      amenities,
    };
  });

  return <VenuesMarketplaceClient initialVenues={venues} />;
}

function formatCurrency(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return "Price on request";
  }
  return `₱${amount.toLocaleString("en-PH")}`;
}