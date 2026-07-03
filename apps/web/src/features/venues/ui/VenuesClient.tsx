"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, SlidersHorizontal, Sparkles, MapPin, Star, Users, Heart } from "lucide-react";

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

export default function VenuesClient({ initialVenues }: { initialVenues: Venue[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recommended");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = initialVenues;

    if (q) {
      list = list.filter((v) => {
        return (
          (v.name || "").toLowerCase().includes(q) ||
          (v.location || "").toLowerCase().includes(q) ||
          (v.category || "").toLowerCase().includes(q)
        );
      });
    }

    if (sort === "price") {
      list = [...list].sort((a, b) => {
        const pa = Number(String(a.price).replace(/[^0-9]/g, "")) || 0;
        const pb = Number(String(b.price).replace(/[^0-9]/g, "")) || 0;
        return pa - pb;
      });
    } else if (sort === "rating") {
      list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return list;
  }, [initialVenues, query, sort]);

  return (
    <div className="h-full min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10">
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
                {filtered.length} venue{filtered.length === 1 ? "" : "s"} found matching your criteria. Compare spaces, pricing, and capacity in one polished marketplace.
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
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search venue name, location, or category..."
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-[#FFFDFC] pl-11 pr-4 text-sm font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-[#E9D5D0] focus:border-[#E07A5F] focus:bg-white focus:ring-4 focus:ring-[#E07A5F]/10"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm transition hover:border-[#E9D5D0]"
                >
                  <option value="recommended">Recommended</option>
                  <option value="price">Price (low → high)</option>
                  <option value="rating">Rating</option>
                </select>

                <button
                  type="button"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 shadow-sm transition hover:border-[#E9D5D0] hover:bg-[#FFF4F1] hover:text-[#9A442D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E07A5F]/20"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Sort
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.map((venue) => (
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
                      {String(typeof venue.rating === "number" ? venue.rating.toFixed(1) : "4.8")}
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

                      <span className="line-clamp-1">{venue.location}</span>
                    </p>
                  </div>

                  <div className="flex items-end justify-between gap-4 border-t border-slate-100 pt-4">
                    <div className="min-w-0">
                      <p className="text-lg font-black leading-6 text-slate-950">{venue.price}</p>

                      <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">starting price</p>
                    </div>

                    <div className="inline-flex max-w-[60%] items-center gap-1.5 rounded-2xl bg-slate-100 px-3 py-2 text-slate-600">
                      <Users className="h-3.5 w-3.5 shrink-0" />

                      <span className="truncate text-[11px] font-extrabold uppercase tracking-[0.08em]">{venue.capacity}</span>
                    </div>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
