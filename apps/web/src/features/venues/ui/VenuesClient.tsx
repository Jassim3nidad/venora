"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Heart,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";

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
  isFavorited?: boolean;
}

const filterKeys = [
  "q",
  "province",
  "city",
  "location",
  "event",
  "budget",
  "capacity",
  "style",
  "amenities",
  "sort",
];

const eventHints: Record<string, string[]> = {
  wedding: ["wedding", "ceremony", "reception", "garden", "estate"],
  birthday: ["birthday", "party", "event", "hall"],
  corporate: ["corporate", "conference", "meeting", "loft", "hall", "hotel"],
  conference: ["conference", "corporate", "meeting", "hall", "hotel"],
  debut: ["debut", "party", "ballroom", "garden", "hall"],
  party: ["party", "event", "hall", "resort", "loft"],
};

function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function parseMoney(value: string) {
  const amount = Number(value.replace(/[^0-9]/g, ""));

  return Number.isFinite(amount) ? amount : 0;
}

function getVenuePrice(venue: Venue) {
  return typeof venue.basePrice === "number"
    ? venue.basePrice
    : parseMoney(venue.price);
}

function getVenueCapacity(venue: Venue) {
  if (typeof venue.capacityMax === "number") return venue.capacityMax;

  const capacity = Number(String(venue.capacity).match(/\d+/)?.[0]);

  return Number.isFinite(capacity) ? capacity : 0;
}

function textIncludes(value: unknown, query: string) {
  return normalize(value).includes(query);
}

function matchesEventType(venue: Venue, eventType: string) {
  if (!eventType) return true;

  const event = normalize(eventType);
  const declaredEvents = venue.eventTypes?.map(normalize) ?? [];

  if (declaredEvents.some((item) => item === event || item.includes(event))) {
    return true;
  }

  if (event === "wedding" && (venue.ceremonyVenue || venue.receptionVenue)) {
    return true;
  }

  const venueText = normalize(
    [venue.name, venue.location, venue.category, venue.indoorOutdoor].join(" "),
  );
  const hints = eventHints[event] ?? [event];

  return hints.some((hint) => venueText.includes(hint));
}

function matchesBudget(venue: Venue, budget: string) {
  if (!budget) return true;

  const price = getVenuePrice(venue);
  if (price <= 0) return false;

  if (budget === "under-100k") return price < 100000;
  if (budget === "100k-300k") return price >= 100000 && price <= 300000;
  if (budget === "luxury") return price > 300000;

  return true;
}

function matchesAmenity(venue: Venue, amenity: string) {
  const normalizedAmenity = normalize(amenity);
  const amenityText = (venue.amenities ?? []).map(normalize);

  if (normalizedAmenity === "parking") {
    return (
      venue.parkingAvailable ||
      amenityText.some((item) => item.includes("park"))
    );
  }

  if (normalizedAmenity === "aircon") {
    return (
      venue.airConditioned || amenityText.some((item) => item.includes("air"))
    );
  }

  if (normalizedAmenity === "pool") {
    return venue.hasPool || amenityText.some((item) => item.includes("pool"));
  }

  if (normalizedAmenity === "pet friendly") {
    return (
      venue.petFriendly || amenityText.some((item) => item.includes("pet"))
    );
  }

  if (normalizedAmenity === "wifi") {
    return amenityText.some(
      (item) =>
        item.includes("wifi") ||
        item.includes("wi-fi") ||
        item.includes("internet"),
    );
  }

  if (normalizedAmenity === "overnight") {
    return (
      venue.overnightAccommodation ||
      amenityText.some(
        (item) => item.includes("overnight") || item.includes("room"),
      )
    );
  }

  return amenityText.some((item) => item.includes(normalizedAmenity));
}

export default function VenuesClient({
  initialVenues,
  favoriteVenueIds = [],
}: {
  initialVenues: Venue[];
  favoriteVenueIds?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const favoriteSet = useMemo(
    () => new Set(favoriteVenueIds.map(String)),
    [favoriteVenueIds],
  );

  const filters = useMemo(() => {
    const params = new URLSearchParams(queryString);

    return {
      query: params.get("q") ?? "",
      province: params.get("province") ?? "",
      city: params.get("city") ?? "",
      location: params.get("location") ?? "",
      eventType: params.get("event") ?? "",
      budget: params.get("budget") ?? "",
      capacity: params.get("capacity") ?? "",
      style: params.get("style") ?? "",
      amenities: (params.get("amenities") ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      sort: params.get("sort") ?? "recommended",
    };
  }, [queryString]);

  const activeFilterCount =
    [
      filters.query,
      filters.province,
      filters.city,
      filters.location,
      filters.eventType,
      filters.budget,
      filters.capacity,
      filters.style,
    ].filter(Boolean).length + filters.amenities.length;

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(queryString);

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  };

  const clearFilters = () => {
    const params = new URLSearchParams(queryString);
    filterKeys.forEach((key) => params.delete(key));

    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  };

  const filtered = useMemo(() => {
    const query = normalize(filters.query);
    const location = normalize(filters.location);
    const city = normalize(filters.city);
    const province = normalize(filters.province);
    const style = normalize(filters.style);
    const requestedCapacity = Number(filters.capacity) || 0;

    const list = initialVenues.filter((venue) => {
      if (query) {
        const matchesQuery =
          textIncludes(venue.name, query) ||
          textIncludes(venue.location, query) ||
          textIncludes(venue.category, query) ||
          textIncludes(venue.city, query) ||
          textIncludes(venue.province, query);

        if (!matchesQuery) return false;
      }

      if (province && normalize(venue.province) !== province) return false;
      if (city && normalize(venue.city) !== city) return false;

      if (location) {
        const matchesLocation =
          textIncludes(venue.location, location) ||
          textIncludes(venue.city, location) ||
          textIncludes(venue.province, location);

        if (!matchesLocation) return false;
      }

      if (!matchesEventType(venue, filters.eventType)) return false;
      if (!matchesBudget(venue, filters.budget)) return false;

      if (
        requestedCapacity > 0 &&
        getVenueCapacity(venue) < requestedCapacity
      ) {
        return false;
      }

      if (style) {
        const matchesStyle =
          textIncludes(venue.category, style) ||
          textIncludes(venue.name, style) ||
          textIncludes(venue.indoorOutdoor, style);

        if (!matchesStyle) return false;
      }

      if (
        filters.amenities.length > 0 &&
        !filters.amenities.every((amenity) => matchesAmenity(venue, amenity))
      ) {
        return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      const aFavorited = favoriteSet.has(String(a.id)) || Boolean(a.isFavorited);
      const bFavorited = favoriteSet.has(String(b.id)) || Boolean(b.isFavorited);

      if (aFavorited !== bFavorited) {
        return aFavorited ? -1 : 1;
      }

      if (filters.sort === "price") {
        const aPrice = getVenuePrice(a) || Number.MAX_SAFE_INTEGER;
        const bPrice = getVenuePrice(b) || Number.MAX_SAFE_INTEGER;
        return aPrice - bPrice;
      }

      if (filters.sort === "rating") {
        return (b.rating || 0) - (a.rating || 0);
      }

      if (filters.sort === "capacity") {
        return getVenueCapacity(b) - getVenueCapacity(a);
      }

      const ratingDiff = (b.rating || 0) - (a.rating || 0);
      if (Math.abs(ratingDiff) > 0.001) return ratingDiff;

      return a.name.localeCompare(b.name);
    });
  }, [favoriteSet, filters, initialVenues]);

  const filterSummary = [
    filters.query && `Search: ${filters.query}`,
    filters.location || filters.city || filters.province,
    filters.eventType,
    filters.budget &&
      (filters.budget === "under-100k"
        ? "Under ₱100k"
        : filters.budget === "100k-300k"
          ? "₱100k-300k"
          : "Luxury"),
    filters.capacity && `${filters.capacity}+ guests`,
    filters.style,
    ...filters.amenities,
  ].filter(Boolean);

  return (
    <div className="h-full min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-7 lg:px-8 xl:px-10">
      {mobileFiltersOpen && (
        <div
          className="fixed inset-0 z-[60] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Venue filters"
        >
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setMobileFiltersOpen(false)}
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
          />

          <div className="absolute inset-x-0 bottom-0 max-h-[88vh] px-3 pb-3">
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-600 shadow-lg"
                aria-label="Close filters"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <Sidebar
              venues={initialVenues}
              presentation="mobile"
              onApply={() => setMobileFiltersOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-8">
        <section className="max-w-full overflow-hidden rounded-[24px] border border-[#E5E7EB]/80 bg-white shadow-sm sm:rounded-[28px]">
          <div className="grid gap-6 p-5 sm:p-6">
            <div className="min-w-0">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1.5 text-[#2563EB]">
                <Sparkles className="h-3.5 w-3.5" />

                <span className="text-[11px] font-extrabold uppercase tracking-[0.14em]">
                  AI-powered venue discovery
                </span>
              </div>

              <h1 className="max-w-3xl break-words text-2xl font-black leading-8 tracking-[-0.035em] text-slate-950 sm:text-4xl sm:leading-tight">
                Wedding & Event Venues
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500 sm:text-base">
                {filtered.length} venue{filtered.length === 1 ? "" : "s"} found
                matching your criteria. Compare spaces, pricing, and capacity in
                one polished marketplace.
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
                  value={filters.query}
                  onChange={(event) => updateFilter("q", event.target.value)}
                  placeholder="Search venue name, location, or category..."
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F9FAFB] pl-11 pr-4 text-sm font-medium text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-[#E5E7EB] focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-[auto_minmax(180px,auto)]">
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(true)}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 shadow-sm transition hover:border-[#E5E7EB] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/20 lg:hidden"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="rounded-full bg-[#2563EB] px-2 py-0.5 text-xs text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                <div className="relative min-w-0">
                  <SlidersHorizontal className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                  <select
                    value={filters.sort}
                    onChange={(event) =>
                      updateFilter("sort", event.target.value)
                    }
                    className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-11 pr-9 text-sm font-bold text-slate-600 shadow-sm outline-none transition hover:border-[#E5E7EB] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                    aria-label="Sort venues"
                  >
                    <option value="recommended">Recommended</option>
                    <option value="price">Price (low to high)</option>
                    <option value="rating">Highest rated</option>
                    <option value="capacity">Largest capacity</option>
                  </select>
                </div>
              </div>
            </div>

            {filterSummary.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                {filterSummary.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1.5 text-xs font-bold text-[#1D4ED8]"
                  >
                    {item}
                  </span>
                ))}

                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-full px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500 transition hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </section>

        {filtered.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[#E5E7EB] bg-white px-6 py-12 text-center shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
              <Search className="h-5 w-5" />
            </div>

            <h2 className="text-lg font-extrabold text-slate-950">
              No venues match those filters
            </h2>

            <p className="mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">
              Try a wider location, a broader budget, or fewer amenities to
              bring more spaces back into view.
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-full bg-[#2563EB] px-5 py-2.5 text-sm font-extrabold text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1d4ed8]"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((venue) => (
              <Link
                key={venue.id}
                href={`/venues/${venue.slug ?? venue.id}`}
                className="group flex h-full overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 hover:border-[#2563EB]/50 hover:shadow-xl hover:shadow-slate-200/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
              >
                <article className="flex h-full w-full flex-col">
                  <div className="relative aspect-[16/11] overflow-hidden bg-slate-100">
                    <img
                      src={venue.image}
                      alt={venue.name}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-slate-950/5 to-transparent" />

                    <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#1D4ED8] shadow-sm backdrop-blur-md">
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
                        {String(
                          typeof venue.rating === "number"
                            ? venue.rating.toFixed(1)
                            : "4.8",
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex min-h-[190px] flex-1 flex-col justify-between gap-5 p-5">
                    <div className="min-w-0">
                      <h2 className="line-clamp-1 text-lg font-extrabold leading-6 tracking-[-0.02em] text-slate-950 transition group-hover:text-[#1D4ED8]">
                        {venue.name}
                      </h2>

                      <p className="mt-2 flex min-w-0 items-center gap-2 text-sm font-medium leading-5 text-slate-500">
                        <MapPin className="h-4 w-4 shrink-0 text-slate-400" />

                        <span className="line-clamp-1">{venue.location}</span>
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
        )}
      </div>
    </div>
  );
}
