import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Bell, HelpCircle, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import VenueDetails from "@/src/features/venues/ui/VenueDetails";
import VenuesMobileMenu from "@/components/layout/VenuesMobileMenu";
import {
  getNearbyResearchVenueDetails,
  getPublicResearchReviews,
  getResearchVenueBySlug,
  getResearchVenueDetailBySlug,
  researchVenues,
} from "@/src/features/venues/data/research-venues";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = (await createClient()) as any;
  const { data: venue } = await supabase
    .from("venues")
    .select("name, description")
    .eq("slug", slug)
    .in(
      "id",
      researchVenues.map((item) => item.id),
    )
    .maybeSingle();

  const datasetVenue = getResearchVenueBySlug(slug);
  const metadataVenue = datasetVenue ?? venue;

  if (!metadataVenue) return { title: "Venue Not Found" };
  return {
    title: metadataVenue.name,
    description:
      "description" in metadataVenue
        ? (metadataVenue.description ?? undefined)
        : metadataVenue.short_description,
  };
}

export default async function VenueDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = (await createClient()) as any;

  async function logoutAction() {
    "use server";

    const supabase = await createClient();
    await supabase.auth.signOut();

    redirect("/login");
  }

  // 1. Fetch current user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2. Fetch primary venue details
  const { data: dbVenue } = await supabase
    .from("venues")
    .select(
      `
      *,
      venue_packages(*),
      venue_images(*),
      venue_amenities(amenities(name)),
      organizations(*)
    `,
    )
    .eq("slug", slug)
    .in(
      "id",
      researchVenues.map((item) => item.id),
    )
    .eq("status", "published")
    .maybeSingle();

  const datasetVenue = getResearchVenueBySlug(slug);
  const venue = getResearchVenueDetailBySlug(slug);

  if (!venue || !datasetVenue) notFound();

  // 3. Fetch reviews associated with this venue
  const { data: reviews } = dbVenue
    ? await supabase
        .from("reviews")
        .select(
          `
          *,
          profiles(
            full_name,
            avatar_url
          )
        `,
        )
        .eq("venue_id", venue.id)
        .eq("status", "published")
        .order("created_at", { ascending: false })
    : { data: getPublicResearchReviews() };

  // 4. Fetch nearby venues in the same province
  const nearbyVenues = getNearbyResearchVenueDetails(datasetVenue);

  // 5. Fetch user favorite status
  let initialIsFavorited = false;
  if (user) {
    const { data: fav } = await supabase
      .from("favorites")
      .select("customer_id")
      .eq("customer_id", user.id)
      .eq("venue_id", venue.id)
      .maybeSingle();

    initialIsFavorited = !!fav;
  }

  return (
    <>
      <header className="z-50 shrink-0 border-b border-[#E5E7EB]/70 bg-white/90 backdrop-blur-xl">
        <div className="relative mx-auto flex min-h-16 w-full max-w-[1600px] items-center gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
          <Link
            href="/venues"
            className="text-lg font-black tracking-tight text-[#2563EB] transition hover:text-[#1d4ed8] sm:text-xl"
          >
            Venora
          </Link>

          <VenuesMobileMenu logoutAction={logoutAction} />

          <nav
            aria-label="Primary navigation"
            className="hidden md:absolute md:left-1/2 md:-translate-x-1/2 md:flex md:justify-center"
          >
            <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 p-1 shadow-sm">
              <Link
                href="/venues"
                className="rounded-full bg-[#EFF6FF] px-4 py-2 text-sm font-semibold text-[#2563EB] transition hover:text-[#1d4ed8]"
              >
                Browse
              </Link>

              <Link
                href="/bookings"
                className="rounded-full px-4 py-2 text-sm font-semibold text-[#6B7280] transition hover:bg-[#EFF6FF] hover:text-[#2563EB]"
              >
                Bookings
              </Link>

              <Link
                href="/favorites"
                className="rounded-full px-4 py-2 text-sm font-semibold text-[#6B7280] transition hover:bg-[#EFF6FF] hover:text-[#2563EB]"
              >
                Favorites
              </Link>
            </div>
          </nav>

          <div className="ml-auto hidden md:flex min-w-0 items-center justify-end gap-1.5 sm:gap-3">
            <button
              type="button"
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-transparent text-slate-400 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-600 lg:inline-flex"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>

            <button
              type="button"
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-transparent text-slate-400 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-600 sm:inline-flex"
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
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#6B7280] shadow-sm transition hover:border-[#E5E7EB] hover:bg-[#F9FAFB] hover:text-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/20 sm:h-10 sm:gap-2 sm:px-4 sm:text-xs sm:tracking-[0.12em]"
              >
                <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <VenueDetails
        venue={venue}
        reviews={reviews || []}
        nearbyVenues={nearbyVenues}
        initialIsFavorited={initialIsFavorited}
        currentUser={user}
      />
    </>
  );
}
