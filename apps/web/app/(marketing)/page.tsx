import Link from "next/link";
import {
  ArrowRight,
  Heart,
  MapPin,
  Search,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import MarketingNavbar from "@/components/layout/MarketingNavbar";
import {
  getMarketplaceResearchVenues,
  researchVenueImageCount,
  researchVenues,
} from "@/src/features/venues/data/research-venues";

const featuredVenues = getMarketplaceResearchVenues()
  .slice(0, 3)
  .map((venue, index) => ({
    name: venue.name,
    slug: venue.slug,
    location: venue.location,
    price: venue.price,
    rating: venue.rating ? venue.rating.toFixed(1) : "New",
    category: venue.category,
    image: venue.image,
    alt: `${venue.name} in ${venue.location}`,
    capacity: venue.capacity,
    filledHeart: index === 0,
  }));

const heroVenue = featuredVenues[0]!;
const provinceCount = new Set(
  researchVenues.map((venue) => venue.location.province),
).size;

const stats = [
  { value: String(researchVenues.length), label: "Research Venues" },
  { value: String(provinceCount), label: "Regions Covered" },
  { value: String(researchVenueImageCount), label: "Linked Images" },
  { value: "100%", label: "Source Checked" },
];

export default function MarketingHomePage() {
  return (
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden bg-[#F9FAFB] text-[#111827] antialiased">
      <MarketingNavbar />

      <main className="w-full flex-grow">
        {/* Hero Section */}
        <section className="relative w-full py-14 md:py-24">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div className="min-w-0">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#E5E7EB] bg-[#EFF6FF] px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-[#1D4ED8]">
                <Sparkles className="h-3.5 w-3.5" />
                Premium event venue marketplace
              </div>

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

              {/* Search Bar */}
              <form
                action="/venues"
                method="GET"
                className="mt-8 w-full max-w-2xl rounded-[24px] border border-[#E5E7EB] bg-white p-2 shadow-xl shadow-slate-200/60"
              >
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-stretch">
                  <div className="min-w-0 border-b border-[#E5E7EB] px-4 py-3 md:border-b-0 md:border-r">
                    <label
                      className="block text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#1D4ED8]"
                      htmlFor="hero-search-location"
                    >
                      Location
                    </label>
                    <input
                      id="hero-search-location"
                      name="location"
                      className="mt-1 w-full min-w-0 border-none bg-transparent p-0 text-sm font-semibold text-[#111827] outline-none placeholder:text-slate-400"
                      placeholder="Where to?"
                      type="text"
                      autoComplete="off"
                    />
                  </div>
                  <div className="min-w-0 border-b border-[#E5E7EB] px-4 py-3 md:border-b-0 md:border-r">
                    <label
                      className="block text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#1D4ED8]"
                      htmlFor="hero-search-event-type"
                    >
                      Event Type
                    </label>
                    <input
                      id="hero-search-event-type"
                      name="event"
                      className="mt-1 w-full min-w-0 border-none bg-transparent p-0 text-sm font-semibold text-[#111827] outline-none placeholder:text-slate-400"
                      placeholder="Wedding, Corporate..."
                      type="text"
                      autoComplete="off"
                    />
                  </div>
                  <button
                    type="submit"
                    className="m-2 inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-6 text-sm font-extrabold text-white transition hover:bg-[#1d4ed8] md:self-center"
                  >
                    <Search className="h-4 w-4" />
                    Search
                  </button>
                </div>
              </form>
            </div>

            {/* Hero Visual Card */}
            <div className="relative hidden min-h-[420px] items-center justify-center overflow-hidden lg:flex">
              <div className="w-full max-w-md rotate-2 rounded-[28px] border border-[#E5E7EB] bg-white p-4 shadow-2xl shadow-slate-200/70 transition-transform duration-300 hover:rotate-0">
                <div className="relative mb-4 h-64 w-full overflow-hidden rounded-[22px]">
                  <img
                    className="h-full w-full object-cover"
                    alt={heroVenue.alt}
                    src={heroVenue.image}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
                  <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-extrabold text-[#111827] shadow-sm backdrop-blur">
                    <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                    {heroVenue.rating}
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
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                      Starting at
                    </p>
                    <p className="text-lg font-black text-[#111827]">
                      {heroVenue.price}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-[#6B7280]">
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
        <section className="w-full py-14 md:py-20">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-7 flex items-end justify-between gap-6">
              <div>
                <h2 className="text-3xl font-black tracking-[-0.04em] text-[#111827] md:text-4xl">
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
                <Link
                  key={venue.name}
                  className="group block overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 hover:border-[#2563EB]/50 hover:shadow-xl hover:shadow-slate-200/80"
                  href={`/venues/${venue.slug}`}
                >
                  <div className="relative h-52 w-full overflow-hidden">
                    <img
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                      alt={venue.alt}
                      src={venue.image}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-transparent" />
                    <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#1D4ED8] shadow-sm backdrop-blur">
                      {venue.category}
                    </div>
                    <span
                      className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm backdrop-blur transition group-hover:text-red-500"
                      aria-hidden="true"
                    >
                      <Heart
                        className={[
                          "h-4 w-4",
                          venue.filledHeart ? "fill-red-500 text-red-500" : "",
                        ].join(" ")}
                      />
                    </span>
                  </div>

                  <div className="p-5">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <h3 className="text-lg font-black tracking-[-0.03em] text-[#111827]">
                        {venue.name}
                      </h3>
                      <div className="flex items-center gap-1 text-sm font-extrabold text-[#111827]">
                        <Star className="h-4 w-4 fill-[#F59E0B] text-[#F59E0B]" />
                        {venue.rating}
                      </div>
                    </div>
                    <p className="mb-5 flex items-center gap-1.5 text-sm font-semibold text-[#6B7280]">
                      <MapPin className="h-4 w-4" />
                      {venue.location}
                    </p>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                      <p className="text-base font-black text-[#111827]">
                        {venue.price}
                      </p>
                      <span className="text-sm font-extrabold text-[#2563EB]">
                        View details
                      </span>
                    </div>
                  </div>
                </Link>
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
