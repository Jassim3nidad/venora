import type { Metadata } from "next";
import { createClient } from "@/src/lib/supabase/server";
import VenueMarketplace from "@/src/features/venues/ui/VenueMarketplace";

export const metadata: Metadata = {
  title: "Explore Venues | Venora Marketplace",
  description: "Browse verified wedding gardens, beachfront resorts, function halls, and ballroom venues across the Philippines.",
};

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
    cover_image: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=800&h=600&q=80",
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

export default async function VenuesPage() {
  // Fetch real published venues from database
  const supabase = await createClient();
  const { data: dbVenues } = await supabase
    .from("venues")
    .select("*, venue_images(storage_path)")
    .eq("status", "published");

  // Format database venues or fallback to mock data
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
      category: "all", // default fallback category
      cover_image,
      description: v.description ?? "",
    };
  });

  if (venues.length === 0) {
    venues = MOCK_VENUES;
  }

  return (
    <div className="w-full bg-white flex flex-col items-center">
      <div className="w-full max-w-[1400px] px-6 md:px-12 py-10 space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 font-display">
            Explore Venues
          </h1>
          <p className="text-xs text-zinc-500 mt-1 font-medium">
            Search, compare, and instantly book vetted venues for your events.
          </p>
        </div>

        <VenueMarketplace initialVenues={venues} />
      </div>
    </div>
  );
}
