import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Heart, Search, Sparkles } from "lucide-react";
import { CustomerNavbar } from "@/components/layout/CustomerNavbar";
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

  const { data: profile } = (await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle()) as any;

  const favoriteVenues = await getFavoriteVenuesForUser(user.id);
  const favoriteCount = favoriteVenues.length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827]">
      <CustomerNavbar user={user} profile={profile} />

      <main>
        <section className="relative overflow-hidden border-b border-[#E5E7EB] bg-[#F9FAFB]">
          <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-8">
              <Link
                href="/venues"
                className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-bold text-[#6B7280] shadow-sm transition hover:border-[#2563EB]/50 hover:bg-[#EFF6FF] hover:text-[#2563EB]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Venues
              </Link>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2563EB]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Saved venue shortlist
                </div>

                <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-[-0.05em] text-[#111827] sm:text-5xl">
                  Your favorite venues, ready when you are.
                </h1>

                <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-[#6B7280] sm:text-base">
                  Review saved spaces, compare the details that matter, and
                  return to the venues you want to book next.
                </p>
              </div>

              <div className="rounded-[28px] border border-[#E5E7EB] bg-white p-5 shadow-xl shadow-slate-200/60">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
                    <Heart className="h-5 w-5 fill-[#2563EB]" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#6B7280]">
                      Saved venues
                    </p>
                    <p className="mt-1 text-3xl font-black tracking-[-0.04em] text-[#111827]">
                      {favoriteCount}
                    </p>
                    <p className="mt-2 text-sm font-medium leading-6 text-[#6B7280]">
                      {favoriteCount > 0
                        ? "Your shortlist is ready for another look."
                        : "Start saving venues from the marketplace."}
                    </p>
                  </div>
                </div>

                <Link
                  href="/venues"
                  className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-5 text-sm font-extrabold text-white shadow-lg shadow-[#2563EB]/20 transition hover:bg-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
                >
                  <Search className="h-4 w-4" />
                  Browse Venues
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
                Collection
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-[#111827]">
                Saved venues
              </h2>
            </div>

            <div className="inline-flex w-fit items-center rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-2 text-sm font-extrabold text-[#2563EB]">
              {favoriteCount} saved
            </div>
          </div>

          <FavoritesGrid initialVenues={favoriteVenues} />
        </section>
      </main>
    </div>
  );
}
