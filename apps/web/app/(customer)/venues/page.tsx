import Link from "next/link";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import { Bell, HelpCircle, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import VenuesClient from "@/src/features/venues/ui/VenuesClient";

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
  province?: string;
  basePrice?: number;
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
  amenities?: string[];
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
    city: "Tagaytay City",
    province: "Cavite",
    basePrice: 120000,
    capacityMax: 300,
    indoorOutdoor: "outdoor",
    airConditioned: false,
    parkingAvailable: true,
    overnightAccommodation: true,
    petFriendly: false,
    hasPool: false,
    eventTypes: ["Wedding", "Debut", "Party"],
    amenities: ["Parking", "Overnight"],
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
    city: "Makati City",
    province: "Metro Manila",
    basePrice: 85000,
    capacityMax: 150,
    indoorOutdoor: "indoor",
    airConditioned: true,
    parkingAvailable: true,
    overnightAccommodation: false,
    petFriendly: false,
    hasPool: false,
    eventTypes: ["Corporate", "Conference", "Birthday"],
    amenities: ["Parking", "Aircon", "WiFi"],
  },
];

function asNumber(value: unknown) {
  const amount = Number(value);

  return Number.isFinite(amount) ? amount : undefined;
}

function asStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

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

  async function logoutAction() {
    "use server";

    const supabase = await createClient();
    await supabase.auth.signOut();

    redirect("/login");
  }

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
          const basePrice = asNumber(venue.base_price ?? venue.starting_price);
          const capacityMax = asNumber(venue.capacity_max);
          const city = venue.city ?? "";
          const province = venue.province ?? "";

          return {
            id: venue.id,
            slug: venue.slug ?? String(venue.id),
            name: venue.name ?? "Untitled Venue",
            location:
              city && province
                ? `${city}, ${province}`
                : city || province || "Location unavailable",
            price: formatCurrency(basePrice),
            capacity: capacityMax
              ? `Up to ${capacityMax} pax`
              : "Capacity unavailable",
            image: buildVenueImageUrl(firstImage),
            rating: Number(venue.rating ?? 4.8),
            category: venue.category ?? venue.venue_type ?? "Event Venue",
            city,
            province,
            basePrice,
            capacityMax,
            latitude: asNumber(venue.latitude) ?? null,
            longitude: asNumber(venue.longitude) ?? null,
            indoorOutdoor: venue.indoor_outdoor ?? null,
            airConditioned: Boolean(venue.air_conditioned),
            parkingAvailable: Boolean(venue.parking_available),
            overnightAccommodation: Boolean(venue.overnight_accommodation),
            petFriendly: Boolean(venue.pet_friendly),
            wheelchairAccessible: Boolean(venue.wheelchair_accessible),
            hasPool: Boolean(venue.has_pool),
            ceremonyVenue: Boolean(venue.ceremony_venue),
            receptionVenue: Boolean(venue.reception_venue),
            eventTypes: asStringArray(venue.event_types ?? venue.eventTypes),
            amenities: asStringArray(venue.amenities),
          };
        })
      : fallbackVenues;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F9FAFB] text-[#111827]">
      <header className="sticky top-0 z-50 shrink-0 border-b border-[#E5E7EB]/70 bg-white/90 backdrop-blur-xl">
        <div className="relative mx-auto flex min-h-16 w-full max-w-[1600px] items-center gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-lg font-black tracking-[-0.04em] text-[#2563EB] transition hover:text-[#1d4ed8] sm:text-xl"
          >
            Venora
          </Link>

          <nav
            aria-label="Primary navigation"
            className="absolute left-1/2 hidden -translate-x-1/2 justify-center md:flex"
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
            </div>
          </nav>

          <div className="ml-auto flex min-w-0 items-center justify-end gap-1.5 sm:gap-3">
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
          <VenuesClient initialVenues={venues} />
        </main>
      </div>
    </div>
  );
}
