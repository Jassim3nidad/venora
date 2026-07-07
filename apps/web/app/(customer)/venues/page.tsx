import { CustomerNavbar } from "@/components/layout/CustomerNavbar";
import { createClient } from "@/lib/supabase/server";
import VenuesClient from "@/src/features/venues/ui/VenuesClient";
import {
  researchVenues,
  toMarketplaceVenue,
} from "@/src/features/venues/data/research-venues";

export interface Venue {
  id: string | number;
  slug?: string;
  name: string;
  location: string;
  price: string;
  capacity: string;
  image: string;
  rating?: number;
  category?: string;
  city?: string;
  municipality?: string;
  province?: string;
  basePrice?: number;
  budgetRange?: string;
  capacityMin?: number | null;
  capacityMax?: number;
  latitude?: number | null;
  longitude?: number | null;
  indoorOutdoor?: string | null;
  airConditioned?: boolean;
  parkingAvailable?: boolean;
  overnightAccommodation?: boolean;
  petFriendly?: boolean;
  wheelchairAccessible?: boolean;
  hasPool?: boolean;
  ceremonyVenue?: boolean;
  receptionVenue?: boolean;
  eventTypes?: string[];
  categories?: string[];
  amenities?: string[];
  isFavorited?: boolean;
}

export default async function VenuesMarketplacePage() {
  const supabase = await createClient();

  const { data: dbVenues, error } = await (supabase.from("venues") as any)
    .select(
      `
      *,
      venue_images(storage_path, is_featured, display_order),
      venue_category_assignments(venue_categories(name, slug)),
      venue_event_types(event_types(name, slug)),
      venue_amenities(amenities(name))
    `,
    )
    .in(
      "id",
      researchVenues.map((venue) => venue.id),
    )
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[venues/page] Supabase fetch error:", error.message);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let favoriteVenueIds = new Set<string>();

  if (user) {
    const { data: favoriteRows, error: favoritesError } = await (
      supabase.from("favorites") as any
    )
      .select("venue_id")
      .eq("customer_id", user.id);

    if (favoritesError) {
      console.error(
        "[venues/page] Favorites fetch error:",
        favoritesError.message,
      );
    } else {
      favoriteVenueIds = new Set(
        (favoriteRows ?? []).map((row: any) => String(row.venue_id)),
      );
    }
  }

  const researchVenueById = new Map(
    researchVenues.map((venue) => [venue.id, venue]),
  );

  const orderedResearchVenues =
    dbVenues && dbVenues.length === researchVenues.length
      ? (dbVenues as Array<{ id: string }>)
          .map((venue) => researchVenueById.get(String(venue.id)))
          .filter((venue): venue is (typeof researchVenues)[number] =>
            Boolean(venue),
          )
      : researchVenues;

  const venues: Venue[] = orderedResearchVenues.map((venue) =>
    toMarketplaceVenue(venue, favoriteVenueIds),
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F9FAFB] text-[#111827]">
      <CustomerNavbar user={user} />

      <div className="flex min-h-0 w-full flex-1 overflow-hidden">
        <VenuesClient
          initialVenues={venues}
          favoriteVenueIds={[...favoriteVenueIds]}
        />
      </div>
    </div>
  );
}