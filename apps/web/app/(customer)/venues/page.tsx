import Link from "next/link";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import {
  Bell,
  HelpCircle,
  Heart,
  LogOut,
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

function formatRating(rating?: number) {
  if (typeof rating === "number" && Number.isFinite(rating)) {
    return rating.toFixed(1);
  }

  return "4.8";
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
    <div className="flex h-screen flex-col overflow-hidden bg-[#F8FAFC] text-slate-950">
      <header className="z-50 shrink-0 border-b border-[#E9D5D0]/70 bg-white/90 backdrop-blur-xl">
        <div className="relative mx-auto flex min-h-16 w-full max-w-[1600px] items-center gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-[#E07A5F] transition hover:text-[#d96851] sm:text-xl"
          >
            Venora
          </Link>

          <nav
            aria-label="Primary navigation"
            className="absolute left-1/2 hidden -translate-x-1/2 justify-center md:flex"
          >
            <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 p-1 shadow-sm">
              <Link
                href="/venues"
                className="rounded-full bg-[#FFF4F1] px-4 py-2 text-sm font-semibold text-[#E07A5F] transition hover:text-[#d96851]"
              >
                Browse
              </Link>

              <Link
                href="/bookings"
                className="rounded-full px-4 py-2 text-sm font-semibold text-[#6B7280] transition hover:bg-[#FFF4F1] hover:text-[#E07A5F]"
              >
                Bookings
              </Link>
            </div>
          </nav>

          <div className="ml-auto flex min-w-0 items-center justify-end gap-1.5 sm:gap-3">
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
              className="inline-flex h-9 items-center justify-center rounded-full bg-[#E07A5F] px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-white shadow-sm shadow-[#E07A5F]/20 transition hover:bg-[#d96851] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E07A5F]/30 sm:h-10 sm:px-4 sm:text-xs sm:tracking-[0.12em]"
            >
              Account
            </Link>

            <form action={logoutAction} className="shrink-0">
              <button
                type="submit"
                aria-label="Logout"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#6B7280] shadow-sm transition hover:border-[#E9D5D0] hover:bg-[#FFFDFC] hover:text-[#9A442D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E07A5F]/20 sm:h-10 sm:gap-2 sm:px-4 sm:text-xs sm:tracking-[0.12em]"
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
          <Sidebar />
        </div>

        <main className="h-full min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10">
          <div className="flex flex-col gap-8">
            <section className="max-w-full overflow-hidden rounded-[24px] border border-[#E9D5D0]/80 bg-white shadow-sm sm:rounded-[28px]">
              <div className="grid gap-6 p-5 sm:p-6">
                <div className="min-w-0">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#F0A090] bg-[#FFF4F1] px-3 py-1.5 text-[#E07A5F]">
                    <Sparkles className="h-3.5 w-3.5" />

                    <span className="text-[11px] font-extrabold uppercase tracking-[0.14em]">
                      AI-powered venue discovery
                    </span>
                  </div>

                  <h1 className="max-w-3xl break-words text-2xl font-black leading-8 tracking-[-0.035em] text-slate-950 sm:text-4xl sm:leading-tight">
                    Wedding & Event Venues
                  </h1>

                  <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500 sm:text-base">
                    {venues.length} venue{venues.length === 1 ? "" : "s"}{" "}
                    found matching your criteria. Compare spaces, pricing, and
                    capacity in one polished marketplace.
                  </p>
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="relative min-w-0">
                    <label htmlFor="venue-search" className="sr-only">
                      Search venue name
                    </label>

                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      id="venue-search"
                      type="search"
                      placeholder="Search venue name..."
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-[#FFFDFC] pl-11 pr-4 text-sm font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-[#E9D5D0] focus:border-[#E07A5F] focus:bg-white focus:ring-4 focus:ring-[#E07A5F]/10"
                    />
                  </div>

                  <button
                    type="button"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 shadow-sm transition hover:border-[#E9D5D0] hover:bg-[#FFF4F1] hover:text-[#9A442D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E07A5F]/20"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    Sort: Recommended
                  </button>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {venues.map((venue) => (
                <Link
                  key={venue.id}
                  href={`/venues/${venue.slug ?? venue.id}`}
                  className="group flex h-full overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 hover:border-[#E07A5F]/50 hover:shadow-xl hover:shadow-slate-200/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E07A5F]/30"
                >
                  <article className="flex h-full w-full flex-col">
                    <div className="relative aspect-[16/11] overflow-hidden bg-slate-100">
                      <img
                        src={venue.image}
                        alt={venue.name}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-slate-950/5 to-transparent" />

                      <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#9A442D] shadow-sm backdrop-blur-md">
                        {venue.category}
                      </span>

                      <span
                        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm backdrop-blur-md transition group-hover:text-red-500"
                        aria-hidden="true"
                      >
                        <Heart className="h-4 w-4" />
                      </span>

                      <div className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-slate-800 shadow-sm backdrop-blur-md">
                        <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />

                        <span className="text-xs font-extrabold">
                          {formatRating(venue.rating)}
                        </span>
                      </div>
                    </div>

                    <div className="flex min-h-[190px] flex-1 flex-col justify-between gap-5 p-5">
                      <div className="min-w-0">
                        <h2 className="line-clamp-1 text-lg font-extrabold leading-6 tracking-[-0.02em] text-slate-950 transition group-hover:text-[#9A442D]">
                          {venue.name}
                        </h2>

                        <p className="mt-2 flex min-w-0 items-center gap-2 text-sm font-medium leading-5 text-slate-500">
                          <MapPin className="h-4 w-4 shrink-0 text-slate-400" />

                          <span className="line-clamp-1">
                            {venue.location}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-end justify-between gap-4 border-t border-slate-100 pt-4">
                        <div className="min-w-0">
                          <p className="text-lg font-black leading-6 text-slate-950">
                            {venue.price}
                          </p>

                          <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                            starting price
                          </p>
                        </div>

                        <div className="inline-flex max-w-[60%] items-center gap-1.5 rounded-2xl bg-slate-100 px-3 py-2 text-slate-600">
                          <Users className="h-3.5 w-3.5 shrink-0" />

                          <span className="truncate text-[11px] font-extrabold uppercase tracking-[0.08em]">
                            {venue.capacity}
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}