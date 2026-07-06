"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, MapPin, Star, Users } from "lucide-react";
import { toggleFavoriteAction } from "../application/actions";
import type { MarketplaceVenue } from "../data/research-venues";

interface FavoritesGridProps {
  initialVenues: MarketplaceVenue[];
}

export default function FavoritesGrid({ initialVenues }: FavoritesGridProps) {
  const [venues, setVenues] = useState(initialVenues);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleUnfavorite = async (
    event: React.MouseEvent<HTMLButtonElement>,
    venueId: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const previousVenues = venues;
    setVenues((current) => current.filter((venue) => String(venue.id) !== venueId));
    setPendingId(venueId);

    const result = await toggleFavoriteAction({ venueId });

    setPendingId(null);

    if (result.error || result.data?.isFavorited) {
      // Restore on failure, or if the toggle somehow re-added it
      setVenues(previousVenues);
    }
  };

  if (venues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-[28px] border border-dashed border-[#E5E7EB] bg-white px-6 py-20 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
          <Heart className="h-7 w-7" />
        </div>
        <h2 className="mt-5 text-xl font-black tracking-[-0.02em] text-slate-950">
          You haven&apos;t saved any venues yet
        </h2>
        <p className="mt-2 max-w-sm text-sm font-medium leading-6 text-slate-500">
          Tap the heart icon on any venue while browsing to save it here for
          later.
        </p>
        <Link
          href="/venues"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-[#2563EB] px-6 py-3 text-sm font-extrabold text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1d4ed8]"
        >
          Browse venues
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {venues.map((venue) => {
        const id = String(venue.id);
        const isPending = pendingId === id;

        return (
          <article
            key={id}
            className="group relative flex h-full overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 hover:border-[#2563EB]/50 hover:shadow-xl hover:shadow-slate-200/80"
          >
            <Link
              href={`/venues/${venue.slug ?? id}`}
              className="flex h-full w-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
            >
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

                <div className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-slate-800 shadow-sm backdrop-blur-md">
                  <Star className="h-3.5 w-3.5 fill-[#F59E0B] text-[#F59E0B]" />
                  <span className="text-xs font-extrabold">
                    {typeof venue.rating === "number" ? venue.rating.toFixed(1) : "New"}
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
            </Link>

            <button
              type="button"
              onClick={(event) => handleUnfavorite(event, id)}
              disabled={isPending}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-red-500 shadow-sm backdrop-blur-md transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 disabled:cursor-wait disabled:opacity-70"
              aria-label={`Remove ${venue.name} from favorites`}
            >
              <Heart className="h-4 w-4 fill-red-500 text-red-500" />
            </button>
          </article>
        );
      })}
    </div>
  );
}
