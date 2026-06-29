import Link from "next/link";
import { createClient } from "@/src/lib/supabase/server";
import { Star, Trees, Palmtree, Compass, Building2, PartyPopper, Building, Heart, ChevronRight, Search, MapPin, Users, Calendar } from "lucide-react";
import Image from "next/image";

// Categories metadata mapping
const CATEGORIES = [
  { name: "All homes", slug: "all", icon: Compass },
  { name: "Gardens", slug: "garden", icon: Trees },
  { name: "Beachfronts", slug: "beach", icon: Palmtree },
  { name: "Resorts", slug: "resort", icon: Building2 },
  { name: "Ballrooms", slug: "hotel-ballroom", icon: Building },
  { name: "Function Halls", slug: "function-hall", icon: PartyPopper },
];

// Fallback high-fidelity mock data mapping for local/seed instances (8 venues for balanced grid)
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
    description: "Lush tropical indoor gardens with high-ceiling glass domes.",
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
    cover_image: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=800&h=600&q=80",
    description: "Lush mountain ridges overlooking the famous Taal Volcano panorama.",
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
    cover_image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&h=600&q=80",
    description: "Modern, fully air-conditioned ballroom with high acoustic walls.",
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
    description: "Private garden estate offering rustic gazebo receptions.",
  },
  {
    id: "mock-7",
    name: "Palacio de Memoria Estate",
    slug: "palacio-de-memoria",
    province: "Metro Manila",
    city: "Parañaque",
    capacity_max: 400,
    base_price: 180000,
    avg_rating: 4.88,
    review_count: 15,
    category: "garden",
    cover_image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&h=600&q=80",
    description: "Restored pre-war heritage mansion with wide manicured garden grounds.",
  },
  {
    id: "mock-8",
    name: "Acuatico Beach Resort",
    slug: "acuatico-beach-resort",
    province: "Batangas",
    city: "Laiya",
    capacity_max: 300,
    base_price: 165000,
    avg_rating: 4.92,
    review_count: 42,
    category: "beach",
    cover_image: "https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=800&h=600&q=80",
    description: "Luxury infinity pool beach resort setting in Laiya.",
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

  const showSections = !searchLocation && !guestCount && activeCategory === "all";
  const manilaVenues = filteredVenues.filter((v: any) => v.province === "Metro Manila");
  const provincialVenues = filteredVenues.filter((v: any) => v.province !== "Metro Manila");

  return (
    <div className="bg-white w-full flex flex-col items-center">
      {/* ─── Airbnb-style Floating Search Section ─── */}
      <section className="bg-white py-4 px-6 md:px-12 border-b border-zinc-100 w-full flex justify-center">
        <div className="w-full max-w-[1400px] flex justify-center">
          <form
            action="/"
            method="GET"
            className="w-full max-w-4xl rounded-full border border-zinc-200 bg-white shadow-md hover:shadow-lg transition-shadow flex flex-col md:flex-row md:items-center p-1.5"
          >
            {/* Where Field */}
            <div className="flex-[1.5] px-6 py-2 hover:bg-zinc-100 rounded-full transition-colors">
              <label className="block text-[9px] font-extrabold uppercase tracking-wider text-zinc-950">
                Where
              </label>
              <input
                type="text"
                name="location"
                defaultValue={searchLocation}
                placeholder="Search destinations"
                className="w-full bg-transparent text-xs font-semibold text-zinc-800 focus:outline-none placeholder:text-zinc-400 mt-0.5"
              />
            </div>

            <div className="hidden md:block w-px h-8 bg-zinc-200" />

            {/* When Field */}
            <div className="flex-1 px-6 py-2 hover:bg-zinc-100 rounded-full transition-colors cursor-pointer">
              <label className="block text-[9px] font-extrabold uppercase tracking-wider text-zinc-950">
                When
              </label>
              <div className="flex items-center gap-1.5 mt-0.5 text-zinc-400 font-semibold text-xs">
                <Calendar className="h-3.5 w-3.5" />
                <span>Add dates</span>
              </div>
            </div>

            <div className="hidden md:block w-px h-8 bg-zinc-200" />

            {/* Who Field */}
            <div className="flex-1 px-6 py-2 hover:bg-zinc-100 rounded-full transition-colors">
              <label className="block text-[9px] font-extrabold uppercase tracking-wider text-zinc-950">
                Who
              </label>
              <input
                type="number"
                name="guests"
                defaultValue={params.guests}
                placeholder="Add guests"
                className="w-full bg-transparent text-xs font-semibold text-zinc-800 focus:outline-none placeholder:text-zinc-400 mt-0.5"
              />
            </div>

            {/* Round search action */}
            <div className="p-1">
              <button
                type="submit"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-600)] text-white hover:bg-brand-700 active:scale-95 transition-all shadow-sm"
              >
                <Search className="h-4.5 w-4.5" />
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ─── Airbnb-style Category Tabs Bar ─── */}
      <section className="px-6 md:px-12 border-b border-zinc-100 w-full flex justify-center">
        <div className="w-full max-w-[1400px] flex items-center justify-start gap-10 overflow-x-auto py-5 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.slug;

            return (
              <Link
                key={cat.slug}
                href={`/?category=${cat.slug}&location=${searchLocation}&guests=${params.guests ?? ""}`}
                className={`flex flex-col items-center gap-2 pb-2 text-[12px] font-semibold tracking-tight transition-all hover:text-zinc-900 border-b-2 hover:border-zinc-300 ${
                  isActive
                    ? "border-zinc-950 text-zinc-950 font-bold"
                    : "border-transparent text-zinc-500"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{cat.name}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ─── Standard Venue Grids ─── */}
      <section className="w-full max-w-[1400px] px-6 md:px-12 py-10">
        {filteredVenues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Search className="h-12 w-12 text-zinc-200 mb-3" />
            <h3 className="font-bold text-zinc-950 text-[15px]">No listings match your search</h3>
            <p className="text-xs text-zinc-500 mt-1">Try resetting the destination queries or capacity guest counts.</p>
            <Link
              href="/"
              className="mt-5 rounded-xl border border-zinc-250 bg-white px-5 py-2.5 text-xs font-semibold hover:bg-zinc-50 transition-colors"
            >
              Clear Filters
            </Link>
          </div>
        ) : showSections ? (
          <div className="space-y-16 animate-slide-up">
            {/* Section 1: Metro Manila */}
            <div className="space-y-6">
              <div className="flex items-center gap-1.5 cursor-pointer group">
                <h2 className="text-xl font-bold tracking-tight text-zinc-950 font-display">
                  Popular wedding estates in Metro Manila
                </h2>
                <ChevronRight className="h-5 w-5 text-zinc-800 transition-transform group-hover:translate-x-0.5" />
              </div>
              <div className="grid gap-x-6 gap-y-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {manilaVenues.map((venue: any) => (
                  <VenueCard key={venue.id} venue={venue} />
                ))}
              </div>
            </div>

            {/* Section 2: Regional Escapes */}
            <div className="space-y-6">
              <div className="flex items-center gap-1.5 cursor-pointer group">
                <h2 className="text-xl font-bold tracking-tight text-zinc-950 font-display">
                  Scenic retreats in Cavite & Batangas
                </h2>
                <ChevronRight className="h-5 w-5 text-zinc-800 transition-transform group-hover:translate-x-0.5" />
              </div>
              <div className="grid gap-x-6 gap-y-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {provincialVenues.map((venue: any) => (
                  <VenueCard key={venue.id} venue={venue} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-slide-up">
            <h2 className="text-xl font-bold tracking-tight text-zinc-950 font-display">
              Search Results
            </h2>
            <div className="grid gap-x-6 gap-y-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredVenues.map((venue: any) => (
                <VenueCard key={venue.id} venue={venue} />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Sub-Component: Borderless Venue Card ───
function VenueCard({ venue }: { venue: any }) {
  return (
    <Link href={`/venues/${venue.slug}`} className="group block space-y-2">
      {/* Card Image Cover wrapper */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-100">
        <Image
          src={venue.cover_image}
          alt={venue.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.015]"
          sizes="(max-width: 768px) 100vw, 25vw"
        />

        {/* Favorite Heart Outline */}
        <div className="absolute right-3.5 top-3.5 text-white hover:scale-105 transition-transform duration-150">
          <Heart className="h-6 w-6 stroke-white fill-black/30 stroke-[2px] hover:fill-rose-600 hover:stroke-rose-600" />
        </div>

        {/* Guest favorite Tag */}
        {venue.avg_rating >= 4.8 && (
          <div className="absolute left-3.5 top-3.5 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-black tracking-tight text-zinc-950 shadow-sm border border-zinc-150">
            Guest favorite
          </div>
        )}
      </div>

      {/* Meta Labels Block */}
      <div className="space-y-1 text-xs">
        {/* City/Province & Rating */}
        <div className="flex items-center justify-between text-[14px]">
          <span className="font-extrabold text-zinc-950">
            {venue.city}, {venue.province}
          </span>
          <span className="flex items-center gap-1 text-zinc-950">
            <Star className="h-3.5 w-3.5 fill-zinc-950 text-zinc-950" />
            <span className="font-bold">{venue.avg_rating.toFixed(2)}</span>
          </span>
        </div>

        {/* Title */}
        <p className="text-zinc-500 font-medium text-[13px] line-clamp-1">{venue.name}</p>

        {/* Guest capacity */}
        <p className="text-zinc-400 font-normal text-[12px]">Max {venue.capacity_max} guests</p>

        {/* Price tag */}
        <div className="text-[13px] font-bold text-zinc-950 pt-0.5">
          ₱{venue.base_price.toLocaleString()}
          <span className="text-zinc-500 font-normal ml-0.5">per event</span>
        </div>
      </div>
    </Link>
  );
}
