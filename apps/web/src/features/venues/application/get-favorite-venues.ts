import { createClient } from "@/lib/supabase/server";
import {
  researchVenues,
  toMarketplaceVenue,
  type MarketplaceVenue,
} from "../data/research-venues";

/**
 * Returns the venues a customer has favorited, ordered by most recently
 * saved first. Favorite rows live in Supabase (`favorites` table) but the
 * venue display data itself comes from the curated research-venues dataset,
 * mirroring how the main /venues marketplace page resolves venue records.
 */
export async function getFavoriteVenuesForUser(
  userId: string,
): Promise<MarketplaceVenue[]> {
  const supabase = await createClient();

  const { data: favoriteRows, error } = await (supabase.from("favorites") as any)
    .select("venue_id, created_at")
    .eq("customer_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[get-favorite-venues] Supabase fetch error:", error.message);
    return [];
  }

  const orderedIds: string[] = (favoriteRows ?? []).map((row: any) => String(row.venue_id));
  const favoriteIdSet = new Set(orderedIds);
  const orderIndex = new Map<string, number>(
    orderedIds.map((id, index) => [id, index]),
  );

  return researchVenues
    .filter((venue) => favoriteIdSet.has(venue.id))
    .sort(
      (a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0),
    )
    .map((venue) => toMarketplaceVenue(venue, favoriteIdSet));
}
