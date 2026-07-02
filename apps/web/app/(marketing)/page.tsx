import React from "react";
import { createClient } from "@/src/lib/supabase/server";
import BrowseClient from "@/components/venues/BrowseClient";
import type { Venue } from "@/components/venues/BrowseClient";

export const metadata = {
  title: "Browse Wedding & Event Venues | Venora",
  description: "Discover and book premium event spaces and wedding venues with real-time filters and search.",
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80";

const fallbackVenues: Venue[] = [
  {
    id: "1",
    slug: "the-glasshouse-estate",
    name: "The Glasshouse Estate",
    location: "Tagaytay City, Cavite",
    price: "₱120,000",
    capacity: "Up to 300 pax",
    image:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
    rating: 4.9,
    category: "Garden Venue",
    province: "Cavite",
    city: "Tagaytay City",
    capacity_max: 300,
    base_price: 120000,
    latitude: 14.1153,
    longitude: 120.9621,
    air_conditioned: true,
    parking_available: true,
    overnight_accommodation: false,
    pet_friendly: false,
    wheelchair_accessible: true,
    has_pool: false,
    eventTypes: ["Wedding", "Debut", "Birthday", "Corporate"],
    categories: ["Garden", "Events Space"],
    amenities: ["Air Conditioning", "Parking", "Bridal Suite", "Sound System"],
  },
];

function formatCurrency(value: unknown) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return "Price on request";
  }

  return `₱${amount.toLocaleString("en-PH")}`;
}

function buildVenueImageUrl(storagePath?: string | null) {
  if (!storagePath) return FALLBACK_IMAGE;

  if (storagePath.startsWith("http")) {
    return storagePath;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) return FALLBACK_IMAGE;

  return `${supabaseUrl}/storage/v1/object/public/venue-images/${storagePath}`;
}

export default async function VenuesMarketplacePage() {
  const supabase = await createClient();

  const { data: dbVenues, error } = await (supabase.from("venues") as any)
    .select(`
      *,
      venue_images(storage_path),
      venue_category_assignments(venue_categories(name, slug)),
      venue_event_types(event_types(name, slug)),
      venue_amenities(amenities(name))
    `)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[venues/page] Supabase fetch error:", error.message);
  }

  const venues: Venue[] =
    dbVenues && dbVenues.length > 0
      ? dbVenues.map((venue: any) => {
          const firstImage = venue.venue_images?.[0]?.storage_path;

          const venueEventTypes =
            venue.venue_event_types?.map((et: any) => et.event_types?.name) || [];
          const venueCategories =
            venue.venue_category_assignments?.map((c: any) => c.venue_categories?.name) || [];
          const venueAmenities =
            venue.venue_amenities?.map((a: any) => a.amenities?.name) || [];

          return {
            id: String(venue.id),
            slug: venue.slug ?? String(venue.id),
            name: venue.name ?? "Untitled Venue",
            location:
              venue.city && venue.province
                ? `${venue.city}, ${venue.province}`
                : venue.city || venue.province || "Location unavailable",
            price: formatCurrency(venue.base_price ?? venue.starting_price),
            capacity: venue.capacity_max
              ? `Up to ${venue.capacity_max} pax`
              : "Capacity unavailable",
            image: buildVenueImageUrl(firstImage),
            rating: Number(venue.rating ?? 4.8),
            category: venue.category ?? venue.venue_type ?? venueCategories[0] ?? "Event Venue",
            province: venue.province ?? "",
            city: venue.city ?? "",
            capacity_max: Number(venue.capacity_max ?? 0),
            base_price: Number(venue.base_price ?? 0),
            latitude: venue.latitude ? Number(venue.latitude) : null,
            longitude: venue.longitude ? Number(venue.longitude) : null,
            air_conditioned: Boolean(venue.air_conditioned),
            parking_available: Boolean(venue.parking_available),
            overnight_accommodation: Boolean(venue.overnight_accommodation),
            pet_friendly: Boolean(venue.pet_friendly),
            wheelchair_accessible: Boolean(venue.wheelchair_accessible),
            has_pool: Boolean(venue.has_pool),
            eventTypes: venueEventTypes,
            categories: venueCategories,
            amenities: venueAmenities,
          };
        })
      : fallbackVenues;

  const { data: { user } } = await supabase.auth.getUser();

  let userRoles: string[] = [];
  if (user) {
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    userRoles = (roleRows ?? []).map((r: any) => r.role);
  }

  return (
    <BrowseClient
      initialVenues={venues}
      userEmail={user?.email || null}
      userRoles={userRoles}
    />
  );
}