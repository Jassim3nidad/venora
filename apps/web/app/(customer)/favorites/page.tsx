import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Heart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getFavoriteVenuesForUser } from "@/src/features/venues/application/get-favorite-venues";
import FavoritesGrid from "@/src/features/venues/ui/FavoritesGrid";

export const metadata: Metadata = { title: "Favorites" };

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/favorites");

  const favoriteVenues = await getFavoriteVenuesForUser(user.id);

  return (
    <main className="min-h-screen bg-[#F9FAFB]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/venues"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-bold text-[#6B7280] shadow-sm transition hover:border-[#2563EB]/50 hover:bg-[#EFF6FF] hover:text-[#2563EB]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Venues
          </Link>
        </div>

        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
            <Heart className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-[-0.03em] text-slate-950">
              Your Favorites
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {favoriteVenues.length > 0
                ? `${favoriteVenues.length} venue${favoriteVenues.length === 1 ? "" : "s"} saved for later.`
                : "Venues you save while browsing will show up here."}
            </p>
          </div>
        </div>

        <FavoritesGrid initialVenues={favoriteVenues} />
      </div>
    </main>
  );
}
