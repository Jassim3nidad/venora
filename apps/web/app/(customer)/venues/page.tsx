import { createClient } from "@/lib/supabase/server";
import VenuesClient from "@/src/features/venues/ui/VenuesClient";
import {
  researchVenues,
  toMarketplaceVenue,
  type ResearchVenue,
} from "@/src/features/venues/data/research-venues";
import {
  searchMarketplaceVenues,
  type VenueSearchParams,
} from "@/src/features/venues/application/queries";

import {
  Venue,
  toLiveMarketplaceVenue,
} from "@/src/features/venues/utils/venue-mappers";

export default async function VenuesMarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  const filters: VenueSearchParams = {
    q: params.q as string | undefined,
    province: params.province as string | undefined,
    city: params.city as string | undefined,
    municipality: params.municipality as string | undefined,
    location: params.location as string | undefined,
    event: params.event as string | undefined,
    budget: params.budget as string | undefined,
    minBudget: params.minBudget as string | undefined,
    maxBudget: params.maxBudget as string | undefined,
    capacity: params.capacity as string | undefined,
    indoorOutdoor: params.indoorOutdoor as string | undefined,
    page: 1,
    limit: 12,
  };

  if (params.venueTypes) {
    filters.venueTypes = String(params.venueTypes).split(",");
  }

  if (params.amenities) {
    filters.amenities = String(params.amenities).split(",");
  }

  const { data: dbVenues, error } = await searchMarketplaceVenues(
    supabase,
    filters,
  );

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

  const researchVenueBySlug = new Map(
    researchVenues.filter((v) => v.slug).map((venue) => [venue.slug, venue]),
  );
  const dbRows = error ? [] : ((dbVenues ?? []) as any[]);
  const dbSlugs = new Set(dbRows.map((venue) => venue.slug).filter(Boolean));
  const livePublishedVenues = dbRows
    .filter(
      (venue) =>
        venue.status === "published" &&
        !venue.name.toLowerCase().includes("tenant a") &&
        !venue.name.toLowerCase().includes("tenant b"),
    )
    .map((venue) =>
      toLiveMarketplaceVenue(
        venue,
        favoriteVenueIds,
        researchVenueBySlug.get(venue.slug),
      ),
    );

  const fallbackVenues = researchVenues
    .filter((venue) => !dbSlugs.has(venue.slug))
    .map((venue) => toMarketplaceVenue(venue, favoriteVenueIds));

  const venues: Venue[] =
    dbRows.length > 0
      ? [...livePublishedVenues, ...fallbackVenues]
      : researchVenues.map((venue) =>
          toMarketplaceVenue(venue, favoriteVenueIds),
        );

  return (
    <VenuesClient
      initialVenues={venues}
      favoriteVenueIds={[...favoriteVenueIds]}
    />
  );
}
