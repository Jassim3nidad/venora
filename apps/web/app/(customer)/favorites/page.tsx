import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FavoritesPageContent from "@/features/favorites/ui/FavoritesPageContent";
import { getFavoriteSuppliersForUser } from "@/features/suppliers/application/get-favorite-suppliers";
import { getFavoriteVenuesForUser } from "@/src/features/venues/application/get-favorite-venues";

export const metadata: Metadata = { title: "Favorites" };

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/favorites");

  const [favoriteVenues, favoriteSuppliers] = await Promise.all([
    getFavoriteVenuesForUser(user.id),
    getFavoriteSuppliersForUser(user.id),
  ]);

  return (
    <FavoritesPageContent
      favoriteVenues={favoriteVenues}
      favoriteSuppliers={favoriteSuppliers}
    />
  );
}
