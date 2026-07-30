import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  BriefcaseBusiness,
  CalendarCheck,
  DoorOpen,
  PartyPopper,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  TreePine,
  Waves,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import MarketingNavbar from "@/components/layout/MarketingNavbar";
import {
  getMarketplaceResearchVenues,
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
import {
  RevealGroup,
  RevealItem,
  ScrollReveal,
  ScrollRevealGroup,
} from "@/src/components/animations/RevealAnimations";
import { landingPrimaryActions } from "@/src/features/event-planning/utils/landing-actions";

const trustItems = [
  {
    icon: BadgeCheck,
    title: "Verified venue details",
    text: "Clear essentials before you inquire.",
  },
  {
    icon: Banknote,
    title: "Transparent starting prices",
    text: "Compare budgets with less back-and-forth.",
  },
  {
    icon: Sparkles,
    title: "Curated local venues",
    text: "Browse spaces selected for real events.",
  },
  {
    icon: ShieldCheck,
    title: "Secure booking through Venora",
    text: "Keep requests and next steps in one place.",
  },
];

const categoryLinks = [
  {
    label: "Weddings",
    href: "/venues?event=Wedding",
    icon: PartyPopper,
    image:
      "https://images.pexels.com/photos/14703685/pexels-photo-14703685.jpeg?auto=compress&cs=tinysrgb&w=900",
  },
  {
    label: "Debuts",
    href: "/venues?event=Debut",
    icon: Star,
    image:
      "https://images.unsplash.com/photo-1745569470313-244808b99ee5?auto=format&fit=crop&w=900&q=80",
  },
  {
    label: "Corporate Events",
    href: "/venues?event=Corporate",
    icon: BriefcaseBusiness,
    image:
      "https://images.unsplash.com/photo-1559223607-a43c990c692c?auto=format&fit=crop&w=900&q=80",
  },
  {
    label: "Garden Venues",
    href: "/venues?venueTypes=garden",
    icon: TreePine,
    image:
      "https://images.pexels.com/photos/35985252/pexels-photo-35985252.jpeg?auto=compress&cs=tinysrgb&w=900",
  },
  {
    label: "Resorts",
    href: "/venues?venueTypes=resort",
    icon: Waves,
    image:
      "https://images.unsplash.com/photo-1760943013869-65a30a4fafd1?auto=format&fit=crop&w=900&q=80",
  },
  {
    label: "Indoor Venues",
    href: "/venues?indoorOutdoor=indoor",
    icon: DoorOpen,
    image:
      "https://images.unsplash.com/photo-1537600175206-a1f0c734dceb?auto=format&fit=crop&w=900&q=80",
  },
];

const workflowSteps = [
  {
    icon: Search,
    title: "Discover venues",
    text: "Search by location, event type, capacity, and venue style.",
  },
  {
    icon: CalendarCheck,
    title: "Compare details",
    text: "Review photos, pricing, amenities, and booking signals.",
  },
  {
    icon: ShieldCheck,
    title: "Request your booking",
    text: "Send a request and keep the conversation organized.",
  },
];

const landingHeroBackgroundSrc = "/images/landing-hero-venue-bg.png";

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

  const researchVenueBySlug = new Map(
    researchVenues.filter((v) => v.slug).map((venue) => [venue.slug, venue]),
  );
  const liveVenues = (error ? [] : ((dbVenues ?? []) as any[]))
    .filter((venue) => venue.status === "published")
    .map((venue) =>
      toLiveMarketplaceVenue(
        venue,
        favoriteVenueIds,
        researchVenueBySlug.get(venue.slug),
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
    : mergeLandingSearchSuggestionSources(liveSuggestionVenues, fallbackVenues);
  const searchSuggestions = buildLandingSearchSuggestions(suggestionVenues);
  const heroVenues = featuredVenues.slice(0, 3);

  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-[#F8FAFC] text-[#111827] antialiased">
      <MarketingNavbar />

      <div className="w-full flex-grow">
        <section className="relative isolate w-full overflow-visible bg-slate-950 pb-20 pt-10 sm:pb-28 sm:pt-14 md:pb-32 lg:pb-28 lg:pt-16">
          <div className="absolute inset-0 -z-10">
            <img
              src={landingHeroBackgroundSrc}
              alt="Venora event venue hero background"
              className="h-full w-full object-cover opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-950/35 to-slate-950/5" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 via-transparent to-slate-950/10" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent via-white/70 to-white sm:h-40 lg:h-48" />
          </div>

          <RevealGroup
            className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:min-h-[560px] lg:justify-between lg:px-8"
            staggerDelay={0.08}
          >
            <div className="max-w-4xl pt-4">
              <RevealItem
                yOffset={8}
                className="mb-6 flex flex-wrap gap-2 sm:gap-3 lg:mb-8"
              >
                {categoryLinks.slice(0, 3).map((category) => (
                  <Link
                    key={category.label}
                    href={category.href}
                    className="rounded-2xl border border-white/20 bg-white/14 px-4 py-2.5 text-xs font-bold text-white shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-[1px] hover:bg-white/22 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:px-5 sm:py-3 sm:text-sm"
                  >
                    {category.label}
                  </Link>
                ))}
              </RevealItem>

              <RevealItem yOffset={12}>
                <h1 className="max-w-4xl text-4xl font-bold leading-[1.04] text-white sm:text-5xl lg:text-7xl">
                  Where Extraordinary Events Begin
                </h1>
              </RevealItem>
              <RevealItem yOffset={12}>
                <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-white/86 sm:text-lg lg:mt-6 lg:text-xl lg:leading-8">
                  Discover, compare, and book the perfect space for your next
                  event. The premier marketplace for curated, high-quality
                  venues.
                </p>
              </RevealItem>
              <RevealItem
                yOffset={12}
                className="mt-6 flex flex-col gap-3 sm:flex-row"
              >
                {landingPrimaryActions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className={[
                      "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
                      action.variant === "primary"
                        ? "bg-white text-[#1D4ED8] hover:bg-[#EFF6FF]"
                        : "border border-white/35 bg-white/12 text-white backdrop-blur hover:bg-white/20",
                    ].join(" ")}
                  >
                    {action.label}
                    {action.variant === "primary" ? (
                      <ArrowRight className="h-4 w-4" />
                    ) : null}
                  </Link>
                ))}
              </RevealItem>
            </div>

            <RevealItem
              yOffset={16}
              className="relative z-10 mt-8 w-full sm:mt-16 lg:mt-16 lg:-mb-36 lg:translate-y-8"
            >
              <LandingSegmentedSearch
                {...searchSuggestions}
                variant="hero-panel"
              />
            </RevealItem>
          </RevealGroup>
        </section>

        <section className="w-full border-b border-[#E5E7EB] bg-white py-5 lg:pb-5 lg:pt-32">
          <ScrollReveal yOffset={16}>
            <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-3 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
              {trustItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.title}
                    className="flex min-w-0 items-start gap-3 rounded-2xl border border-slate-100 bg-[#F8FAFC] p-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-950">
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm font-medium leading-5 text-slate-500">
                        {item.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollReveal>
        </section>

        <section className="w-full bg-white py-12 md:py-16">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <ScrollReveal yOffset={12}>
              <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold leading-tight text-slate-950 md:text-3xl">
                    Explore by event or venue type
                  </h2>
                  <p className="mt-2 text-sm font-medium leading-6 text-slate-500 sm:text-base">
                    Start with the kind of celebration you are planning.
                  </p>
                </div>
                <Link
                  href="/venues"
                  className="group inline-flex items-center gap-2 text-sm font-bold text-[#2563EB] transition-all hover:text-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
                >
                  Browse all
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </ScrollReveal>

            <ScrollRevealGroup
              staggerDelay={0.06}
              className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6"
            >
              {categoryLinks.map((category) => {
                const Icon = category.icon;

                return (
                  <RevealItem key={category.label} yOffset={8}>
                    <Link
                      href={category.href}
                      className="group block overflow-hidden rounded-[20px] border border-[#E5E7EB] bg-white shadow-sm shadow-slate-200/40 transition-all duration-200 hover:-translate-y-[2px] hover:border-[#BFDBFE] hover:shadow-lg hover:shadow-slate-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 active:scale-[0.99]"
                    >
                      <div className="relative h-20 bg-[#EFF6FF] sm:h-24">
                        <img
                          src={category.image}
                          alt={`${category.label} category venue preview`}
                          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.025]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/30 via-slate-950/5 to-transparent" />
                        <span className="absolute bottom-3 left-3 flex h-8 w-8 items-center justify-center rounded-xl bg-white/92 text-[#2563EB] shadow-sm backdrop-blur transition-transform duration-200">
                          <Icon className="h-4 w-4" />
                        </span>
                      </div>
                      <div className="px-4 py-3">
                        <span className="text-sm font-bold leading-5 text-slate-950 transition group-hover:text-[#1D4ED8]">
                          {category.label}
                        </span>
                      </div>
                    </Link>
                  </RevealItem>
                );
              })}
            </ScrollRevealGroup>
          </div>
        </section>

        <section
          aria-labelledby="featured-venues-heading"
          className="w-full bg-[#F8FAFC] py-14 md:py-20"
        >
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <ScrollReveal yOffset={12}>
              <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2
                    id="featured-venues-heading"
                    className="text-2xl font-bold leading-tight text-[#111827] md:text-3xl"
                  >
                    Featured Venues
                  </h2>
                  <p className="mt-2 text-base font-medium text-[#6B7280]">
                    Popular spaces with the details customers compare first.
                  </p>
                </div>
                <Link
                  className="group hidden items-center gap-2 text-sm font-bold text-[#2563EB] transition-all hover:text-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 md:flex"
                  href="/venues"
                >
                  View All Venues
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </ScrollReveal>

            <ScrollRevealGroup
              staggerDelay={0.08}
              className="grid grid-cols-1 gap-6 md:grid-cols-3"
            >
              {featuredVenues.map((venue) => (
                <RevealItem key={String(venue.id)} yOffset={16}>
                  <FeaturedVenueCard
                    venue={venue}
                    isAuthenticated={Boolean(user)}
                  />
                </RevealItem>
              ))}
            </ScrollRevealGroup>

            <ScrollReveal yOffset={12}>
              <Link
                className="group mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white text-sm font-bold text-[#2563EB] transition-all duration-200 hover:-translate-y-[1px] hover:bg-[#EFF6FF] hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 md:hidden"
                href="/venues"
              >
                View All Venues
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Link>
            </ScrollReveal>
          </div>
        </section>

        <section
          data-testid="landing-how-it-works"
          className="w-full border-y border-[#DBEAFE] bg-[#F5F9FF] py-14 md:py-20"
        >
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <ScrollReveal yOffset={12}>
              <div className="mx-auto mb-8 max-w-2xl text-center">
                <h2 className="text-2xl font-bold leading-tight text-slate-950 md:text-3xl">
                  How Venora Works
                </h2>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-500 sm:text-base">
                  A simpler path from shortlist to confirmed event space.
                </p>
              </div>
            </ScrollReveal>

            <ScrollRevealGroup
              staggerDelay={0.08}
              className="grid gap-4 md:grid-cols-3"
            >
              {workflowSteps.map((step) => {
                const Icon = step.icon;

                return (
                  <RevealItem key={step.title} yOffset={12}>
                    <div className="h-full rounded-[20px] border border-[#E5E7EB] bg-white p-5 shadow-sm shadow-slate-200/50">
                      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-950">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                        {step.text}
                      </p>
                    </div>
                  </RevealItem>
                );
              })}
            </ScrollRevealGroup>
          </div>
        </section>

        <section className="w-full bg-[#F8FAFC] px-4 py-14 sm:px-6 md:py-20 lg:px-8">
          <ScrollReveal
            yOffset={16}
            className="mx-auto grid max-w-7xl overflow-hidden rounded-[28px] border border-[#E5E7EB] bg-white shadow-sm shadow-slate-200/70 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"
          >
            <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#2563EB]">
                For venue owners
              </p>
              <h2 className="mt-3 text-2xl font-bold leading-tight text-slate-950 md:text-3xl">
                Have a venue worth discovering?
              </h2>
              <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-slate-500 sm:text-base">
                List your space, manage inquiries, and give customers the
                details they need to book with confidence.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/account/become-partner"
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#2563EB] px-6 text-sm font-bold text-white shadow-sm shadow-[#2563EB]/20 transition-all duration-200 hover:-translate-y-[1px] hover:bg-[#1D4ED8] hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
                >
                  List Your Venue
                </Link>
                <Link
                  href="/venues"
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#DBEAFE] bg-white px-6 text-sm font-bold text-[#1D4ED8] transition-all duration-200 hover:-translate-y-[1px] hover:bg-[#EFF6FF] hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
                >
                  See the marketplace
                </Link>
              </div>
            </div>

            {heroVenues[0] ? (
              <div className="relative min-h-64 bg-slate-200 lg:min-h-[360px]">
                <img
                  src={heroVenues[0].image}
                  alt={`${heroVenues[0].name} hosted event venue`}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-slate-950/20" />
              </div>
            ) : null}
          </ScrollReveal>
        </section>
      </div>
    </div>
  );
}
