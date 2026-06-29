import Link from "next/link";
import { createClient } from "@/src/lib/supabase/server";
import { Card, CardContent, Badge, Separator, Avatar, AvatarFallback } from "@venora/ui";
import {
  Search,
  MapPin,
  Users,
  Star,
  Trees,
  Palmtree,
  Compass,
  Building2,
  PartyPopper,
  Building,
  Sparkles,
  Map,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import Image from "next/image";

// Categories metadata mapping
const CATEGORIES = [
  { name: "All Venues", slug: "all", icon: Compass },
  { name: "Gardens", slug: "garden", icon: Trees },
  { name: "Beaches", slug: "beach", icon: Palmtree },
  { name: "Resorts", slug: "resort", icon: Building2 },
  { name: "Ballrooms", slug: "hotel-ballroom", icon: Building },
  { name: "Function Halls", slug: "function-hall", icon: PartyPopper },
];

// Fallback high-fidelity mock data mapping for local/seed instances
const MOCK_VENUES = [
  {
    id: "mock-1",
    name: "The Glass Garden Estate",
    slug: "the-glass-garden",
    province: "Metro Manila",
    city: "Pasig",
    capacity_max: 350,
    base_price: 85000,
    avg_rating: 4.9,
    review_count: 48,
    category: "garden",
    cover_image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&h=600&q=80",
    description: "Lush tropical indoor gardens with high-ceiling glass domes, perfect for nature-infused celebrations.",
  },
  {
    id: "mock-2",
    name: "Pico de Loro Beach Cove",
    slug: "pico-de-loro-beach-club",
    province: "Batangas",
    city: "Nasugbu",
    capacity_max: 500,
    base_price: 150000,
    avg_rating: 4.8,
    review_count: 32,
    category: "beach",
    cover_image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&h=600&q=80",
    description: "Pristine white sand beach cove overlooking the West Philippine Sea with luxury sunset setups.",
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
    cover_image: "https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=800&h=600&q=80",
    description: "Lush mountain ridges overlooking the famous Taal Volcano panorama, ideal for intimate gatherings.",
  },
  {
    id: "mock-4",
    name: "The Grand Heritage Ballroom",
    slug: "the-manila-hotel-ballroom",
    province: "Metro Manila",
    city: "Ermita",
    capacity_max: 800,
    base_price: 250000,
    avg_rating: 4.95,
    review_count: 76,
    category: "hotel-ballroom",
    cover_image: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=800&h=600&q=80",
    description: "Grand historical ballroom featuring crystal chandeliers and premium banquet catering.",
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
    cover_image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&h=600&q=80",
    description: "Modern, fully air-conditioned ballroom with high acoustic walls and modular staging arrangements.",
  },
  {
    id: "mock-6",
    name: "Hacienda Solange Estate",
    slug: "hacienda-solange",
    province: "Cavite",
    city: "Alfonso",
    capacity_max: 200,
    base_price: 110000,
    avg_rating: 4.85,
    review_count: 29,
    category: "garden",
    cover_image: "https://images.unsplash.com/photo-1508672019048-805c876b67e2?auto=format&fit=crop&w=800&h=600&q=80",
    description: "Private garden estate offering rustic gazebo receptions and bespoke wedding services.",
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
    const imagePath = v.venue_images?.[0]?.storage_path;
    const cover_image = imagePath
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/venue-images/${imagePath}`
      : "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&h=600&q=80";

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
      category: "all",
      cover_image,
      description: v.description ?? "",
    };
  });

  if (venues.length === 0) {
    venues = MOCK_VENUES;
  }

  // 3. Apply active filters
  const filteredVenues = venues.filter((venue: any) => {
    const matchesCategory = activeCategory === "all" || venue.category === activeCategory;
    const matchesLocation =
      !searchLocation ||
      venue.province.toLowerCase().includes(searchLocation.toLowerCase()) ||
      venue.city.toLowerCase().includes(searchLocation.toLowerCase());
    const matchesGuests = !guestCount || venue.capacity_max >= guestCount;
    return matchesCategory && matchesLocation && matchesGuests;
  });

  return (
    <div className="space-y-16 pb-24">
      {/* ─── Hero Section with Glassmorphic floating card ─── */}
      <section className="relative flex h-[620px] w-full items-center overflow-hidden">
        {/* Cover Background */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1920&h=1080&q=80"
            alt="Philippine Destination Wedding Venue"
            fill
            className="object-cover brightness-50 transition-transform duration-10000 ease-out hover:scale-105"
            priority
          />
        </div>

        {/* Content Container */}
        <div className="container relative z-10 flex h-full flex-col justify-center space-y-8 pt-12">
          <div className="flex flex-col space-y-4">
            <div className="inline-flex max-w-fit items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-md ring-1 ring-white/20 animate-fade-in">
              <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent-400)]" />
              <span>Premium Venue Platform of the Philippines</span>
            </div>
            <h1 className="max-w-3xl font-display text-4xl font-extrabold tracking-tight text-white sm:text-6xl leading-[1.1]">
              Find & Book the Ideal Location for Your Life's Milestones
            </h1>
            <p className="max-w-xl text-base text-white/80 leading-relaxed font-sans font-medium">
              Explore handpicked, fully vetted venues across the Philippines. Instantly request dates, verify pricing tiers, and communicate with coordinators directly.
            </p>
          </div>

          {/* Premium Glassmorphic Search Bar */}
          <form
            action="/"
            method="GET"
            className="w-full max-w-4xl rounded-3xl border border-white/20 bg-white/95 p-4 shadow-2xl backdrop-blur-xl md:rounded-full"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              {/* Location Input */}
              <div className="flex-1 px-4">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Where
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="h-4.5 w-4.5 text-[var(--color-brand-600)]" />
                  <input
                    type="text"
                    name="location"
                    defaultValue={searchLocation}
                    placeholder="Search by city or province..."
                    className="w-full bg-transparent text-sm font-semibold text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-muted)]"
                  />
                </div>
              </div>

              <div className="hidden h-10 w-px bg-[var(--border-default)] md:block" />

              {/* Guests Input */}
              <div className="flex-1 px-4">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Guests Limit
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Users className="h-4.5 w-4.5 text-[var(--color-brand-600)]" />
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
                className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-brand-600)] px-8 py-3.5 font-semibold text-white shadow-[var(--shadow-brand)] hover:bg-[var(--color-brand-700)] active:scale-[0.98] transition-all md:rounded-full"
              >
                <Search className="h-4.5 w-4.5" />
                <span>Search</span>
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ─── Categories Horizontal Scroller ─── */}
      <section className="container">
        <div className="flex items-center justify-start gap-10 overflow-x-auto border-b border-[var(--border-default)] pb-4 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.slug;

            return (
              <Link
                key={cat.slug}
                href={`/?category=${cat.slug}&location=${searchLocation}&guests=${params.guests ?? ""}`}
                className={`group flex flex-col items-center gap-2 pb-2 text-xs font-bold tracking-tight transition-all hover:text-[var(--text-primary)] ${
                  isActive
                    ? "border-b-2 border-[var(--color-brand-600)] text-[var(--text-primary)]"
                    : "border-transparent text-[var(--text-secondary)] opacity-70 hover:opacity-100"
                }`}
              >
                <Icon className={`h-5 w-5 transition-transform group-hover:-translate-y-0.5 ${isActive ? "text-[var(--color-brand-600)]" : ""}`} />
                <span>{cat.name}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ─── Platform Features / Trust Indicators ─── */}
      <section className="container grid gap-6 sm:grid-cols-3">
        <div className="flex items-start gap-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-5 shadow-sm">
          <div className="rounded-xl bg-brand-50 p-2.5 text-[var(--color-brand-600)]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-display font-bold text-sm text-[var(--text-primary)]">100% Vetted Listings</h4>
            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
              Every garden, beach cove, and ballroom undergoes site safety and capacity verification checkmarks.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-5 shadow-sm">
          <div className="rounded-xl bg-brand-50 p-2.5 text-[var(--color-brand-600)]">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-display font-bold text-sm text-[var(--text-primary)]">Direct Coordinator Sync</h4>
            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
              Eliminate back-and-forth emails. Synchronize and lock dates instantly with real-time calendars.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-5 shadow-sm">
          <div className="rounded-xl bg-brand-50 p-2.5 text-[var(--color-brand-600)]">
            <Map className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-display font-bold text-sm text-[var(--text-primary)]">OpenFreeMap Tiles</h4>
            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
              Browse localized regions and pinpoint precise directions on vector WebGL topography canvas.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Featured Venues List ─── */}
      <section className="container space-y-8">
        <div className="flex items-end justify-between border-b border-[var(--border-default)] pb-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] font-display">
              Featured Venues
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">
              Top-rated locations with high booking fidelity and strict sanitation clearances.
            </p>
          </div>
          <Link
            href="/venues"
            className="group flex items-center gap-1 text-xs font-semibold text-[var(--color-brand-600)] hover:underline"
          >
            <span>View all venues</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {filteredVenues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 border border-dashed border-[var(--border-default)] rounded-3xl bg-[var(--bg-subtle)] space-y-4 shadow-inner">
            <Search className="h-12 w-12 text-[var(--text-muted)]" />
            <div className="text-center space-y-1">
              <p className="text-sm font-bold text-[var(--text-primary)]">No venues match your criteria</p>
              <p className="text-xs text-[var(--text-secondary)]">Try widening your capacity limits or selecting 'All Venues'.</p>
            </div>
            <Link
              href="/"
              className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-base)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] shadow-sm hover:bg-[var(--bg-subtle)] transition-colors"
            >
              Reset Filters
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {filteredVenues.map((venue: any) => (
              <Link key={venue.id} href={`/venues/${venue.slug}`} className="group block">
                <Card className="overflow-hidden border border-[var(--border-default)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg hover:border-[var(--color-brand-200)]">
                  {/* Photo Carousel Area */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--bg-muted)]">
                    <Image
                      src={venue.cover_image}
                      alt={venue.name}
                      fill
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-103"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <div className="absolute right-3 top-3">
                      <Badge className="bg-white/95 text-[var(--color-brand-600)] font-bold shadow-md backdrop-blur-md border border-white/20">
                        {venue.category.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-5 space-y-4">
                    {/* Location & Rating */}
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[var(--text-secondary)]">
                        {venue.city}, {venue.province}
                      </span>
                      <span className="flex items-center gap-1 text-[var(--text-primary)]">
                        <Star className="h-3.5 w-3.5 fill-[var(--color-accent-500)] text-[var(--color-accent-500)]" />
                        <span>{venue.avg_rating.toFixed(1)}</span>
                        <span className="text-[var(--text-muted)] font-medium">({venue.review_count})</span>
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {/* Title */}
                      <h3 className="font-display font-extrabold text-lg text-[var(--text-primary)] leading-tight group-hover:text-[var(--color-brand-600)] transition-colors">
                        {venue.name}
                      </h3>

                      {/* Description */}
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                        {venue.description}
                      </p>
                    </div>

                    <Separator />

                    {/* Capacity & Price */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-[var(--text-muted)] font-semibold">
                        Max {venue.capacity_max} guests
                      </span>
                      <div className="text-base font-extrabold text-[var(--text-primary)]">
                        ₱{venue.base_price.toLocaleString()}
                        <span className="text-[10px] text-[var(--text-muted)] font-normal ml-0.5">/ event</span>
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
      <section className="container space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] font-display">
            Explore Destination Hotspots
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">
            Browse booking selections in the most pristine coastal retreats and heritage hubs.
          </p>
        </div>

        <div className="grid gap-6 grid-cols-2 md:grid-cols-4">
          {[
            { name: "Tagaytay", image: "https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=600&h=450&q=80" },
            { name: "Boracay", image: "https://images.unsplash.com/photo-1589982424003-83569e5d4816?auto=format&fit=crop&w=600&h=450&q=80" },
            { name: "Cebu", image: "https://images.unsplash.com/photo-1624456776106-9bd90fbe2244?auto=format&fit=crop&w=600&h=450&q=80" },
            { name: "Metro Manila", image: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=600&h=450&q=80" },
          ].map((dest) => (
            <Link
              key={dest.name}
              href={`/?location=${encodeURIComponent(dest.name)}`}
              className="relative aspect-[4/3] rounded-3xl overflow-hidden group shadow-md border border-[var(--border-default)] transition-transform duration-300 hover:-translate-y-1"
            >
              <Image
                src={dest.image}
                alt={dest.name}
                fill
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-107 brightness-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
              <span className="absolute bottom-4 left-5 text-base font-bold text-white font-display">
                {dest.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── Couple & Coordinator Testimonials ─── */}
      <section className="container space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] font-display">
            Loved by Planners & Hosts
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <Card className="bg-[var(--bg-subtle)] border border-[var(--border-default)] p-8 space-y-5 shadow-sm hover:border-[var(--color-brand-100)] transition-colors">
            <span className="font-serif text-5xl leading-none text-[var(--color-brand-200)]">“</span>
            <p className="font-display italic text-[var(--text-primary)] text-sm leading-relaxed mt-[-1rem]">
              We booked Hacienda Solange through Venora for our wedding reception. The verification checks and direct calendar sync with the venue coordinators saved us weeks of email exchanges. Absolute game-changer!
            </p>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-brand-500/10">
                <AvatarFallback className="bg-brand-50 text-[var(--color-brand-600)] font-bold">SR</AvatarFallback>
              </Avatar>
              <div className="text-xs">
                <p className="font-bold text-[var(--text-primary)]">Sophia Ramos</p>
                <p className="text-[var(--text-muted)] font-medium">Bride (December 2026)</p>
              </div>
            </div>
          </Card>

          <Card className="bg-[var(--bg-subtle)] border border-[var(--border-default)] p-8 space-y-5 shadow-sm hover:border-[var(--color-brand-100)] transition-colors">
            <span className="font-serif text-5xl leading-none text-[var(--color-brand-200)]">“</span>
            <p className="font-display italic text-[var(--text-primary)] text-sm leading-relaxed mt-[-1rem]">
              As an event coordinator, managing multiple client dates was chaotic. With Venora's role-based profiles, I can directly manage booking states for my clients without waiting for system administrators.
            </p>
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-brand-500/10">
                <AvatarFallback className="bg-brand-50 text-[var(--color-brand-600)] font-bold">MC</AvatarFallback>
              </Avatar>
              <div className="text-xs">
                <p className="font-bold text-[var(--text-primary)]">Mateo Cruz</p>
                <p className="text-[var(--text-muted)] font-medium">Lead Event Planner, Celestial Events</p>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
