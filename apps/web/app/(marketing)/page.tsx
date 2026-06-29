import Link from "next/link";
import { createClient } from "@/src/lib/supabase/server";
import { Card, CardContent, Badge, Separator, Avatar, AvatarFallback } from "@venora/ui";
import {
  Search,
  MapPin,
  Users,
  Calendar as CalendarIcon,
  Star,
  Trees,
  Palmtree,
  Compass,
  Building2,
  PartyPopper,
  Building,
  Sparkles,
} from "lucide-react";
import Image from "next/image";

// Categories metadata mapping
const CATEGORIES = [
  { name: "All", slug: "all", icon: Compass },
  { name: "Garden", slug: "garden", icon: Trees },
  { name: "Beach", slug: "beach", icon: Palmtree },
  { name: "Resort", slug: "resort", icon: Building2 },
  { name: "Hotel Ballroom", slug: "hotel-ballroom", icon: Building },
  { name: "Function Hall", slug: "function-hall", icon: PartyPopper },
];

// Fallback high-fidelity mock data mapping for local/seed instances
const MOCK_VENUES = [
  {
    id: "mock-1",
    name: "The Glass Garden",
    slug: "the-glass-garden",
    province: "Metro Manila",
    city: "Pasig",
    capacity_max: 350,
    base_price: 85000,
    avg_rating: 4.9,
    review_count: 48,
    category: "garden",
    cover_image: "https://images.unsplash.com/photo-1545232979-8bf34eb9757b?auto=format&fit=crop&w=600&h=400&q=80",
    description: "Lush tropical indoor gardens with high ceiling glass domes.",
  },
  {
    id: "mock-2",
    name: "Pico de Loro Beach Club",
    slug: "pico-de-loro-beach-club",
    province: "Batangas",
    city: "Nasugbu",
    capacity_max: 500,
    base_price: 150000,
    avg_rating: 4.8,
    review_count: 32,
    category: "beach",
    cover_image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&h=400&q=80",
    description: "Pristine white sand beach cove overlooking the West Philippine Sea.",
  },
  {
    id: "mock-3",
    name: "Tagaytay Ridge Retreat",
    slug: "tagaytay-ridge-retreat",
    province: "Cavite",
    city: "Tagaytay",
    capacity_max: 150,
    base_price: 120000,
    avg_rating: 4.75,
    review_count: 24,
    category: "resort",
    cover_image: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=600&h=400&q=80",
    description: "Lush mountain ridges overlooking the famous Taal Volcano panorama.",
  },
  {
    id: "mock-4",
    name: "The Manila Hotel Ballroom",
    slug: "the-manila-hotel-ballroom",
    province: "Metro Manila",
    city: "Ermita",
    capacity_max: 800,
    base_price: 250000,
    avg_rating: 4.95,
    review_count: 76,
    category: "hotel-ballroom",
    cover_image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=600&h=400&q=80",
    description: "Grand historical ballroom featuring crystal chandeliers.",
  },
  {
    id: "mock-5",
    name: "The Bellevue Pavillion",
    slug: "the-bellevue-pavillion",
    province: "Metro Manila",
    city: "Alabang",
    capacity_max: 250,
    base_price: 95000,
    avg_rating: 4.6,
    review_count: 18,
    category: "function-hall",
    cover_image: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=600&h=400&q=80",
    description: "Modern, fully air-conditioned ballroom with high acoustic walls.",
  },
  {
    id: "mock-6",
    name: "Hacienda Solange",
    slug: "hacienda-solange",
    province: "Cavite",
    city: "Alfonso",
    capacity_max: 200,
    base_price: 110000,
    avg_rating: 4.85,
    review_count: 29,
    category: "garden",
    cover_image: "https://images.unsplash.com/photo-1508672019048-805c876b67e2?auto=format&fit=crop&w=600&h=400&q=80",
    description: "Private garden estate offering rustic gazebo receptions.",
  },
];

interface PageProps {
  searchParams: Promise<{
    category?: string;
    location?: string;
    guests?: string;
  }>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const activeCategory = params.category ?? "all";
  const searchLocation = params.location ?? "";
  const guestCount = params.guests ? parseInt(params.guests) : 0;

  // 1. Fetch live published venues from database
  const supabase = await createClient();
  const { data: dbVenues } = await supabase
    .from("venues")
    .select("*, venue_images(storage_path)")
    .eq("status", "published");

  // 2. Format database venues or fallback to mock data
  let venues = ((dbVenues as any) ?? []).map((v: any) => {
    // Generate public storage path URL if images exist
    const imagePath = v.venue_images?.[0]?.storage_path;
    const cover_image = imagePath
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/venue-images/${imagePath}`
      : "https://images.unsplash.com/photo-1545232979-8bf34eb9757b?auto=format&fit=crop&w=600&h=400&q=80";

    return {
      id: v.id,
      name: v.name,
      slug: v.slug,
      province: v.province,
      city: v.city,
      capacity_max: v.capacity_max,
      base_price: Number(v.base_price),
      avg_rating: Number(v.avg_rating) || 5.0,
      review_count: v.review_count || 0,
      category: "all", // default category assignment
      cover_image,
      description: v.description ?? "",
    };
  });

  if (venues.length === 0) {
    venues = MOCK_VENUES;
  }

  // 3. Apply active filters
  const filteredVenues = venues.filter((venue: any) => {
    // Category check
    const matchesCategory =
      activeCategory === "all" || venue.category === activeCategory;

    // Location check
    const matchesLocation =
      !searchLocation ||
      venue.province.toLowerCase().includes(searchLocation.toLowerCase()) ||
      venue.city.toLowerCase().includes(searchLocation.toLowerCase());

    // Guests check
    const matchesGuests = !guestCount || venue.capacity_max >= guestCount;

    return matchesCategory && matchesLocation && matchesGuests;
  });

  return (
    <div className="space-y-12 pb-24">
      {/* ─── Hero Section with Floating Search ─── */}
      <section className="relative h-[550px] w-full overflow-hidden">
        {/* Cover Background */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1920&h=1080&q=80"
            alt="Philippine Destination Wedding Venue"
            fill
            className="object-cover brightness-65 transition-transform duration-10000 ease-out hover:scale-105"
            priority
          />
        </div>

        {/* Hero Title & Description */}
        <div className="container relative z-10 flex h-full flex-col justify-center space-y-6 pt-12 text-white">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="h-3 w-3 text-[var(--color-accent-400)]" />
            Empowering Venues & Hosts Platform
          </div>
          <h1 className="max-w-2xl font-display text-4xl font-extrabold tracking-tight sm:text-6xl">
            Book Your Perfect Philippine Venue
          </h1>
          <p className="max-w-lg text-sm text-white/90 leading-relaxed font-sans">
            From lush garden glass domes in Manila to pristine beach shores in Batangas, find verified venues for your life’s finest celebrations.
          </p>

          {/* Floating Airbnb Search Bar */}
          <form
            action="/"
            method="GET"
            className="w-full max-w-4xl rounded-2xl border border-white/10 bg-white/95 p-3 shadow-2xl backdrop-blur-md md:rounded-full"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              {/* Location Input */}
              <div className="flex-1 px-4 py-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Where
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="h-4 w-4 text-[var(--color-brand-600)]" />
                  <input
                    type="text"
                    name="location"
                    defaultValue={searchLocation}
                    placeholder="Province or City..."
                    className="w-full bg-transparent text-sm font-semibold text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-muted)]"
                  />
                </div>
              </div>

              <Separator orientation="vertical" className="hidden h-8 md:block" />

              {/* Guests Input */}
              <div className="flex-1 px-4 py-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Guests
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Users className="h-4 w-4 text-[var(--color-brand-600)]" />
                  <input
                    type="number"
                    name="guests"
                    defaultValue={params.guests}
                    placeholder="Min capacity count..."
                    className="w-full bg-transparent text-sm font-semibold text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-muted)]"
                  />
                </div>
              </div>

              {/* Submit Action Button */}
              <button
                type="submit"
                className="flex items-center justify-center gap-2 rounded-xl bg-[var(--color-brand-600)] px-6 py-3 font-semibold text-white shadow-[var(--shadow-brand)] hover:bg-[var(--color-brand-700)] transition-all md:rounded-full"
              >
                <Search className="h-4 w-4" />
                <span className="md:hidden">Search Venues</span>
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ─── Categories Horizontal Scroller ─── */}
      <section className="container">
        <div className="flex items-center justify-start gap-8 overflow-x-auto pb-3 pt-2 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.slug;

            return (
              <Link
                key={cat.slug}
                href={`/?category=${cat.slug}&location=${searchLocation}&guests=${params.guests ?? ""}`}
                className={`flex flex-col items-center gap-2 border-b-2 pb-2 text-xs font-semibold transition-all hover:text-[var(--text-primary)] ${
                  isActive
                    ? "border-[var(--color-brand-600)] text-[var(--text-primary)]"
                    : "border-transparent text-[var(--text-secondary)] opacity-70"
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-[var(--color-brand-600)]" : ""}`} />
                <span>{cat.name}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ─── Featured Venues List ─── */}
      <section className="container space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] font-display">
            Featured Philippine Venues
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Top-rated locations with high booking fidelity and strict sanitation clearances.
          </p>
        </div>

        {filteredVenues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-[var(--border-default)] rounded-2xl bg-[var(--bg-subtle)] space-y-3">
            <Search className="h-10 w-10 text-[var(--text-muted)]" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">No venues matched your criteria</p>
            <p className="text-xs text-[var(--text-secondary)]">Try adjusting your location search or capacity counts.</p>
            <Link href="/" className="text-xs font-semibold text-[var(--color-brand-600)] hover:underline">
              Clear all filters
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredVenues.map((venue: any) => (
              <Link key={venue.id} href={`/venues/${venue.slug}`} className="group block">
                <Card className="overflow-hidden border border-[var(--border-default)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-md)]">
                  {/* Photo Carousel Area */}
                  <div className="relative aspect-video w-full overflow-hidden bg-[var(--bg-muted)]">
                    <Image
                      src={venue.cover_image}
                      alt={venue.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <div className="absolute right-3 top-3">
                      <Badge variant="success" className="bg-[var(--color-success)] text-white shadow-md">
                        {venue.category.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-4 space-y-3">
                    {/* Location & Rating */}
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-[var(--text-secondary)]">
                        {venue.city}, {venue.province}
                      </span>
                      <span className="flex items-center gap-1 text-[var(--text-primary)]">
                        <Star className="h-3.5 w-3.5 fill-[var(--color-accent-500)] text-[var(--color-accent-500)]" />
                        {venue.avg_rating.toFixed(1)} ({venue.review_count})
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="font-display font-bold text-base text-[var(--text-primary)] leading-tight group-hover:text-[var(--color-brand-600)] transition-colors">
                      {venue.name}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                      {venue.description}
                    </p>

                    <Separator />

                    {/* Capacity & Price */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-[var(--text-muted)] font-medium">
                        Max {venue.capacity_max} guests
                      </span>
                      <div className="text-sm font-bold text-[var(--text-primary)]">
                        ₱{venue.base_price.toLocaleString()} <span className="text-[10px] text-[var(--text-muted)] font-normal">/ event</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ─── Popular Destinations ─── */}
      <section className="container space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] font-display">
            Explore Philippine Destinations
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Browse bookings in the most beautiful wedding and event hot-spots.
          </p>
        </div>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[
            { name: "Tagaytay", image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&h=300&q=80" },
            { name: "Boracay", image: "https://images.unsplash.com/photo-1589982424003-83569e5d4816?auto=format&fit=crop&w=400&h=300&q=80" },
            { name: "Cebu", image: "https://images.unsplash.com/photo-1624456776106-9bd90fbe2244?auto=format&fit=crop&w=400&h=300&q=80" },
            { name: "Metro Manila", image: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=400&h=300&q=80" },
          ].map((dest) => (
            <Link
              key={dest.name}
              href={`/?location=${encodeURIComponent(dest.name)}`}
              className="relative aspect-[4/3] rounded-2xl overflow-hidden group shadow-sm border border-[var(--border-default)]"
            >
              <Image
                src={dest.image}
                alt={dest.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105 brightness-75"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <span className="absolute bottom-3 left-4 text-sm font-bold text-white font-display">
                {dest.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── Couple & Coordinator Testimonials ─── */}
      <section className="container space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] font-display">
            Loved by Event Planners & Couples
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-[var(--bg-subtle)] border border-[var(--border-default)] p-6 space-y-4">
            <p className="font-display italic text-[var(--text-primary)] text-sm leading-relaxed">
              "We booked Hacienda Solange through Venora for our wedding reception. The verification checks and direct calendar sync with the venue coordinators saved us weeks of email exchanges. Absolute game-changer!"
            </p>
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>SR</AvatarFallback>
              </Avatar>
              <div className="text-xs">
                <p className="font-semibold text-[var(--text-primary)]">Sophia Ramos</p>
                <p className="text-[var(--text-muted)]">Bride (December 2026)</p>
              </div>
            </div>
          </Card>

          <Card className="bg-[var(--bg-subtle)] border border-[var(--border-default)] p-6 space-y-4">
            <p className="font-display italic text-[var(--text-primary)] text-sm leading-relaxed">
              "As an event coordinator, managing multiple client dates was chaotic. With Venora's role-based profiles, I can directly manage booking states for my clients without waiting for system administrators."
            </p>
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>MC</AvatarFallback>
              </Avatar>
              <div className="text-xs">
                <p className="font-semibold text-[var(--text-primary)]">Mateo Cruz</p>
                <p className="text-[var(--text-muted)]">Lead Event Planner, Celestial Events</p>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
