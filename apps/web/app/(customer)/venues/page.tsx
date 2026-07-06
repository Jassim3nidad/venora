import Link from "next/link";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import VenuesMobileMenu from "@/components/layout/VenuesMobileMenu";
import { Bell, HelpCircle, LogOut } from "lucide-react";
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

  async function logoutAction() {
    "use server";

    const supabase = await createClient();
    await supabase.auth.signOut();

    redirect("/login");
  }

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
      <header className="sticky top-0 z-50 shrink-0 border-b border-[#E5E7EB]/70 bg-white/90 backdrop-blur-xl">
        <div className="relative mx-auto flex min-h-16 w-full max-w-[1600px] items-center gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
          <Link
            href="/venues"
            className="text-lg font-black tracking-tight text-[#2563EB] transition hover:text-[#1d4ed8] sm:text-xl"
          >
            Venora
          </Link>

          {/* Mobile: burger menu */}
          <VenuesMobileMenu logoutAction={logoutAction} />

          <nav
            aria-label="Primary navigation"
            className="hidden md:absolute md:left-1/2 md:-translate-x-1/2 md:flex md:justify-center"
          >
            <div className="inline-flex items-center gap-1 rounded-full border border-[#E5E7EB]/80 bg-[#F9FAFB]/90 p-1 shadow-sm">
              <Link
                href="/venues"
                className="rounded-full bg-[#EFF6FF] px-4 py-2 text-sm font-bold text-[#2563EB] transition hover:text-[#1d4ed8]"
              >
                Browse
              </Link>

              <Link
                href="/bookings"
                className="rounded-full px-4 py-2 text-sm font-bold text-[#6B7280] transition hover:bg-[#EFF6FF] hover:text-[#2563EB]"
              >
                Bookings
              </Link>

              <Link
                href="/favorites"
                className="rounded-full px-4 py-2 text-sm font-bold text-[#6B7280] transition hover:bg-[#EFF6FF] hover:text-[#2563EB]"
              >
                Favorites
              </Link>
            </div>
          </nav>

          <div className="ml-auto hidden md:flex min-w-0 items-center justify-end gap-1.5 sm:gap-3">
            <button
              type="button"
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-transparent text-slate-400 transition hover:border-[#E5E7EB] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] lg:inline-flex"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>

            <button
              type="button"
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-transparent text-slate-400 transition hover:border-[#E5E7EB] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] sm:inline-flex"
              aria-label="Help"
            >
              <HelpCircle className="h-4 w-4" />
            </button>

            <Link
              href="/account"
              className="inline-flex h-9 items-center justify-center rounded-full bg-[#2563EB] px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1d4ed8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 sm:h-10 sm:px-4 sm:text-xs sm:tracking-[0.12em]"
            >
              Account
            </Link>

            <form action={logoutAction} className="shrink-0">
              <button
                type="submit"
                aria-label="Logout"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#6B7280] shadow-sm transition hover:bg-[#EFF6FF] hover:text-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/20 sm:h-10 sm:gap-2 sm:px-4 sm:text-xs sm:tracking-[0.12em]"
              >
                <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 w-full flex-1 overflow-hidden">
        <div className="hidden shrink-0 lg:block">
          <Sidebar venues={venues} />
        </div>

        <main className="h-full min-w-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#F9FAFB_0%,#F8FAFC_100%)]">
          <VenuesClient
            initialVenues={venues}
            favoriteVenueIds={[...favoriteVenueIds]}
          />
        </main>
      </div>
    </div>
  );
}
