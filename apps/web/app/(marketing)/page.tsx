import Link from "next/link";
import {
  ArrowRight,
  MapPin,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import MarketingNavbar from "@/components/layout/MarketingNavbar";
import {
  getMarketplaceResearchVenues,
  researchVenueImageCount,
  researchVenues,
} from "@/src/features/venues/data/research-venues";
import {
  getLandingSearchSuggestionVenues,
  searchMarketplaceVenues,
} from "@/src/features/venues/application/queries";
import {
  getFeaturedVenueIds,
  resolveFeaturedMarketplaceVenues,
} from "@/src/features/venues/application/featured-venues";
import { toLiveMarketplaceVenue } from "@/src/features/venues/utils/venue-mappers";
import FeaturedVenueCard from "@/src/features/venues/ui/FeaturedVenueCard";
import LandingSegmentedSearch from "@/src/features/venues/ui/LandingSegmentedSearch";
import {
  buildLandingSearchSuggestions,
  mergeLandingSearchSuggestionSources,
} from "@/src/features/venues/utils/landing-search-suggestions";
const provinceCount = new Set(
  researchVenues.map((venue) => venue.location.province),
).size;

const stats = [
  { value: String(researchVenues.length), label: "Research Venues" },
  { value: String(provinceCount), label: "Regions Covered" },
  { value: String(researchVenueImageCount), label: "Linked Images" },
  { value: "100%", label: "Source Checked" },
];

export default async function MarketingHomePage() {
  const supabase = await createClient();
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
        "[marketing/page] Favorites fetch error:",
        favoritesError.message,
      );
    } else {
      favoriteVenueIds = new Set(
        (favoriteRows ?? []).map((row: any) => String(row.venue_id)),
      );
    }
  }

  const fallbackVenues = getMarketplaceResearchVenues(favoriteVenueIds);
  const featuredVenueIds = getFeaturedVenueIds(fallbackVenues);
  const [featuredResult, suggestionResult] = await Promise.all([
    searchMarketplaceVenues(supabase, {
      page: 1,
      limit: featuredVenueIds.length,
      venueIds: featuredVenueIds,
    }),
    getLandingSearchSuggestionVenues(supabase),
  ]);
  const { data: dbVenues, error } = featuredResult;

  if (error) {
    console.error("[marketing/page] Supabase fetch error:", error.message);
  }
  if (suggestionResult.error) {
    console.error(
      "[marketing/page] Suggestion fetch error:",
      suggestionResult.error.message,
    );
  }

  const researchVenueById = new Map(
    researchVenues.map((venue) => [venue.id, venue]),
  );
  const liveVenues = (error ? [] : ((dbVenues ?? []) as any[]))
    .filter((venue) => venue.status === "published")
    .map((venue) =>
      toLiveMarketplaceVenue(
        venue,
        favoriteVenueIds,
        researchVenueById.get(String(venue.id)),
      ),
    );
  const featuredVenues = resolveFeaturedMarketplaceVenues(
    liveVenues,
    fallbackVenues,
  );
  const liveSuggestionVenues = (suggestionResult.data ?? []).map(
    (venue: any) => ({
      id: String(venue.id),
      location: [venue.city, venue.province].filter(Boolean).join(", "),
      eventTypes: (venue.venue_event_types ?? [])
        .map((assignment: any) => assignment.event_types?.name)
        .filter((name: unknown): name is string => typeof name === "string"),
    }),
  );
  const suggestionVenues = suggestionResult.error
    ? fallbackVenues
    : mergeLandingSearchSuggestionSources(
        liveSuggestionVenues,
        fallbackVenues,
      );
  const searchSuggestions = buildLandingSearchSuggestions(suggestionVenues);
  const heroVenue = featuredVenues[0]!;

  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-[#F9FAFB] text-[#111827] antialiased">
      <MarketingNavbar />

      <main className="w-full flex-grow">
        {/* Hero Section */}
        <section className="relative w-full py-14 md:py-24">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div className="min-w-0">
              <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-[-0.05em] text-[#111827] sm:text-5xl md:text-6xl">
                Where Extraordinary Events Begin
              </h1>
              <p className="mt-5 max-w-xl text-base font-medium leading-7 text-[#6B7280] sm:text-lg">
                Discover, compare, and book the perfect space for your next
                event. The premier marketplace for curated, high-quality venues.
              </p>

              <div className="flex flex-col gap-3 pt-7 sm:flex-row">
                <Link
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#2563EB] px-7 text-sm font-extrabold text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1d4ed8]"
                  href="/venues"
                >
                  Browse Venues
                </Link>
                <Link
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white px-7 text-sm font-extrabold text-[#1D4ED8] shadow-sm transition hover:bg-[#EFF6FF]"
                  href="/account/become-partner"
                >
                  List Your Venue
                </Link>
              </div>

              <LandingSegmentedSearch {...searchSuggestions} />
            </div>

            {/* Hero Visual Card */}
            <div className="relative hidden min-h-[420px] items-center justify-center overflow-hidden lg:flex">
              <div className="w-full max-w-md rotate-2 rounded-[28px] border border-[#E5E7EB] bg-white p-4 shadow-2xl shadow-slate-200/70 transition-transform duration-300 hover:rotate-0">
                <div className="relative mb-4 h-64 w-full overflow-hidden rounded-[22px]">
                  <img
                    className="h-full w-full object-cover"
                    alt={`${heroVenue.name} in ${heroVenue.location}`}
                    src={heroVenue.image}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
                  <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-extrabold text-[#111827] shadow-sm backdrop-blur">
                    <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                    {typeof heroVenue.rating === "number"
                      ? heroVenue.rating.toFixed(1)
                      : "New"}
                  </div>
                </div>

                <h3 className="mb-1 text-xl font-black tracking-[-0.03em] text-[#111827]">
                  {heroVenue.name}
                </h3>
                <p className="mb-4 flex items-center gap-1.5 text-sm font-semibold text-[#6B7280]">
                  <MapPin className="h-4 w-4" />
                  {heroVenue.location}
                </p>

                <div className="flex items-end justify-between border-t border-slate-100 pt-4">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-500">
                      Starting at
                    </p>
                    <p className="text-lg font-black text-[#111827]">
                      {heroVenue.price}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-slate-600">
                    <Users className="h-3.5 w-3.5" />
                    {heroVenue.capacity}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Strip */}
        <section className="w-full border-y border-[#E5E7EB] bg-[#F8FAFC] py-6">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-6 px-4 text-center sm:px-6 md:grid-cols-4 lg:px-8">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-black tracking-[-0.03em] text-[#111827]">
                  {stat.value}
                </p>
                <p className="mt-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#6B7280]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Featured Venues */}
        <section
          aria-labelledby="featured-venues-heading"
          className="w-full py-14 md:py-20"
        >
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-7 flex items-end justify-between gap-6">
              <div>
                <h2
                  id="featured-venues-heading"
                  className="text-3xl font-black tracking-[-0.04em] text-[#111827] md:text-4xl"
                >
                  Featured Venues
                </h2>
                <p className="mt-2 text-base font-medium text-[#6B7280]">
                  Discover our most sought-after spaces.
                </p>
              </div>
              <Link
                className="hidden items-center gap-2 text-sm font-extrabold text-[#2563EB] transition hover:text-[#1D4ED8] md:flex"
                href="/venues"
              >
                View All Venues
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {featuredVenues.map((venue) => (
                <FeaturedVenueCard
                  key={String(venue.id)}
                  venue={venue}
                  isAuthenticated={Boolean(user)}
                />
              ))}
            </div>

            <Link
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white text-sm font-extrabold text-[#2563EB] transition hover:bg-[#EFF6FF] md:hidden"
              href="/venues"
            >
              View All Venues
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
