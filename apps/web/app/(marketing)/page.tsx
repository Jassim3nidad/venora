import React from "react";
import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";
import {
  Bell,
  HelpCircle,
  Heart,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { createClient } from "@/src/lib/supabase/server";

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
}

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80";

const fallbackVenues: Venue[] = [
  {
    id: 1,
    slug: "the-glasshouse-estate",
    name: "The Glasshouse Estate",
    location: "Tagaytay City",
    price: "₱120,000",
    capacity: "Up to 300 pax",
    image:
      "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
    rating: 4.9,
    category: "Garden Venue",
  },
  {
    id: 2,
    slug: "the-foundry-loft",
    name: "The Foundry Loft",
    location: "Makati City",
    price: "₱85,000",
    capacity: "Up to 150 pax",
    image:
      "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80",
    rating: 4.8,
    category: "Event Hall",
  },
];

function formatCurrency(value: unknown) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return "Price on request";
  }

  return `₱${amount.toLocaleString("en-PH")}`;
}

function buildVenueImageUrl(storagePath?: string | null) {
  if (!storagePath) return FALLBACK_IMAGE;

  if (storagePath.startsWith("http")) {
    return storagePath;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) return FALLBACK_IMAGE;

  return `${supabaseUrl}/storage/v1/object/public/venue-images/${storagePath}`;
}

export default async function VenuesMarketplacePage() {
  const supabase = await createClient();

  const { data: dbVenues, error } = await (supabase.from("venues") as any)
    .select("*, venue_images(storage_path)")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[venues/page] Supabase fetch error:", error.message);
  }

  const venues: Venue[] =
    dbVenues && dbVenues.length > 0
      ? dbVenues.map((venue: any) => {
          const firstImage = venue.venue_images?.[0]?.storage_path;

          return {
            id: venue.id,
            slug: venue.slug ?? String(venue.id),
            name: venue.name ?? "Untitled Venue",
            location:
              venue.city && venue.province
                ? `${venue.city}, ${venue.province}`
                : venue.city || venue.province || "Location unavailable",
            price: formatCurrency(venue.base_price ?? venue.starting_price),
            capacity: venue.capacity_max
              ? `Up to ${venue.capacity_max} pax`
              : "Capacity unavailable",
            image: buildVenueImageUrl(firstImage),
            rating: Number(venue.rating ?? 4.8),
            category: venue.category ?? venue.venue_type ?? "Event Venue",
          };
        })
      : fallbackVenues;

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#F8FAFC]">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 flex !h-[64px] w-full shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 !px-[32px] backdrop-blur-md">
        <Link
          href="/"
          className="flex items-center !gap-[6px] !text-[20px] !font-extrabold !leading-[28px] tracking-tight text-[#E07A5F]"
        >
          Venora
          <Sparkles className="!h-[16px] !w-[16px] fill-[#E07A5F] text-[#E07A5F]" />
        </Link>

        <div className="hidden h-full items-center !gap-[32px] md:flex">
          <Link
            href="/venues"
            className="flex h-full items-center border-b-2 border-[#E07A5F] !text-[12px] !font-bold uppercase !tracking-[0.14em] text-[#E07A5F]"
          >
            Browse
          </Link>

          <Link
            href="/bookings"
            className="flex h-full items-center !text-[12px] !font-bold uppercase !tracking-[0.14em] text-slate-500 transition-colors hover:text-[#E07A5F]"
          >
            Bookings
          </Link>
        </div>

        <div className="flex items-center !gap-[14px]">
          <button
            type="button"
            className="flex !h-[36px] !w-[36px] items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Notifications"
          >
            <Bell className="!h-[18px] !w-[18px]" />
          </button>

          <button
            type="button"
            className="flex !h-[36px] !w-[36px] items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Help"
          >
            <HelpCircle className="!h-[18px] !w-[18px]" />
          </button>

          <Link
            href="/account"
            className="flex !h-[38px] items-center justify-center rounded-[12px] bg-[#E07A5F] !px-[18px] !text-[12px] !font-bold uppercase !tracking-[0.12em] text-white shadow-sm transition hover:bg-[#d96851]"
          >
            Account
          </Link>
        </div>
      </nav>

      {/* Main Layout */}
      <div className="flex min-h-[calc(100vh-64px)] w-full items-start overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto !px-[32px] !py-[30px] lg:!px-[40px]">
          {/* Header */}
          <div className="mb-[28px] flex flex-col !gap-[18px] xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-[10px] inline-flex items-center !gap-[8px] rounded-full border border-[#F0A090] bg-[#FFF4F1] !px-[12px] !py-[6px] text-[#E07A5F]">
                <Sparkles className="!h-[14px] !w-[14px]" />
                <span className="!text-[12px] !font-extrabold uppercase !tracking-[0.12em]">
                  AI-powered venue discovery
                </span>
              </div>

              <h1 className="!text-[32px] !font-black !leading-[40px] tracking-[-0.03em] text-slate-950 md:!text-[38px] md:!leading-[46px]">
                Wedding & Event Venues
              </h1>

              <p className="!mt-[6px] !pb-[14px] !font-medium !leading-[22px] text-slate-500">
                {venues.length} venue{venues.length === 1 ? "" : "s"} found matching your criteria.
              </p>
            </div>

            <div className="flex flex-col !gap-[12px] sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="absolute left-[14px] top-1/2 !h-[18px] !w-[18px] -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search venue name..."
                  className="!h-[44px] w-full rounded-[14px] border border-slate-200 bg-white !pl-[42px] !pr-[16px] !text-[14px] !font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#E07A5F] focus:ring-4 focus:ring-[#E07A5F]/10 sm:!w-[260px]"
                />
              </div>

              <button
                type="button"
                className="flex !h-[44px] items-center justify-center !gap-[8px] rounded-[14px] border border-slate-200 bg-white !px-[16px] !text-[13px] !font-bold text-slate-600 shadow-sm transition hover:border-[#E07A5F] hover:text-[#E07A5F]"
              >
                <SlidersHorizontal className="!h-[16px] !w-[16px]" />
                Sort: Recommended
              </button>
            </div>
          </div>

          {/* Venue Grid */}
          <div className="grid grid-cols-1 !gap-[24px] md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {venues.map((venue) => (
              <Link
                key={venue.id}
                href={`/venues/${venue.slug ?? venue.id}`}
                className="group overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#E07A5F]/40 hover:shadow-xl hover:shadow-slate-200/70"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                  <img
                    src={venue.image}
                    alt={venue.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-black/0 opacity-80" />

                  <button
                    type="button"
                    className="absolute right-[14px] top-[14px] z-10 flex !h-[38px] !w-[38px] items-center justify-center rounded-full bg-white/90 text-slate-600 shadow-sm backdrop-blur-md transition hover:bg-white hover:text-red-500"
                    aria-label="Save to favorites"
                  >
                    <Heart className="!h-[17px] !w-[17px]" />
                  </button>

                  <div className="absolute bottom-[14px] left-[14px] flex items-center !gap-[6px] rounded-full bg-white/90 !px-[10px] !py-[6px] text-slate-800 shadow-sm backdrop-blur-md">
                    <Star className="!h-[14px] !w-[14px] fill-[#F59E0B] text-[#F59E0B]" />
                    <span className="!text-[12px] !font-extrabold">
                      {venue.rating?.toFixed(1) ?? "4.8"}
                    </span>
                  </div>
                </div>

                <div className="flex min-h-[172px] flex-col justify-between !gap-[18px] !p-[18px]">
                  <div>
                    <div className="mb-[10px] flex items-center justify-between !gap-[12px]">
                      <span className="rounded-full bg-[#FFF4F1] !px-[10px] !py-[5px] !text-[11px] !font-extrabold uppercase !tracking-[0.1em] text-[#E07A5F]">
                        {venue.category}
                      </span>
                    </div>

                    <h3 className="line-clamp-1 !text-[17px] !font-extrabold !leading-[24px] text-slate-950">
                      {venue.name}
                    </h3>

                    <p className="!mt-[6px] flex items-center !gap-[6px] !text-[13px] !font-medium !leading-[20px] text-slate-500">
                      <MapPin className="!h-[15px] !w-[15px] shrink-0 text-slate-400" />
                      {venue.location}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 !pt-[14px]">
                    <div>
                      <p className="!text-[18px] !font-black !leading-[24px] text-slate-950">
                        {venue.price}
                      </p>
                      <p className="!text-[12px] !font-medium !leading-[16px] text-slate-400">
                        starting price
                      </p>
                    </div>

                    <div className="flex items-center !gap-[6px] rounded-[12px] bg-slate-100 !px-[10px] !py-[8px] text-slate-600">
                      <Users className="!h-[14px] !w-[14px]" />
                      <span className="!text-[11px] !font-extrabold uppercase !tracking-[0.08em]">
                        {venue.capacity}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}