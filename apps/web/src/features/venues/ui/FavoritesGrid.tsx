"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Heart,
  Image as ImageIcon,
  MapPin,
  Star,
  Users,
} from "lucide-react";
import { toggleFavoriteAction } from "../application/actions";
import type { MarketplaceVenue } from "../data/research-venues";
import { isOptimizableImageSrc } from "@/src/lib/image-host";

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
    setVenues((current) =>
      current.filter((venue) => String(venue.id) !== venueId),
    );
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
      <div className="overflow-hidden rounded-[32px] border border-[#E5E7EB] bg-white px-6 py-16 text-center shadow-xl shadow-slate-200/60 sm:px-10 sm:py-20">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#EFF6FF] text-[#2563EB]">
          <Heart className="h-7 w-7" />
        </div>

        <p className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
          No favorites yet
        </p>

        <h2 className="mx-auto mt-2 max-w-xl text-3xl font-black tracking-[-0.05em] text-[#111827]">
          Build a venue shortlist you can return to.
        </h2>

        <p className="mx-auto mt-3 max-w-md text-sm font-medium leading-6 text-[#6B7280]">
          Save promising spaces while browsing Venora, then come back here to
          compare details, pricing, capacity, and location.
        </p>

        <Link
          href="/venues"
          className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-6 text-sm font-extrabold text-white shadow-lg shadow-[#2563EB]/25 transition hover:bg-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
        >
          Browse Venues
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {venues.map((venue) => {
        const id = String(venue.id);
        const isPending = pendingId === id;

        const detailTags = [
          venue.category,
          ...(venue.categories ?? []).slice(0, 1),
          ...(venue.eventTypes ?? []).slice(0, 1),
        ].filter(Boolean) as string[];
        const uniqueDetailTags = [...new Set(detailTags)].slice(0, 2);

        return (
          <article
            key={id}
            className="group relative flex h-full overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white shadow-sm shadow-slate-200/70 transition duration-300 hover:-translate-y-1 hover:border-[#BFDBFE] hover:shadow-xl hover:shadow-slate-200/80"
          >
            <Link
              href={`/venues/${venue.slug ?? id}`}
              className="flex min-w-0 flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-[#EFF6FF]">
                {venue.image ? (
                  <Image
                    src={venue.image}
                    alt={venue.name}
                    fill
                    unoptimized={!isOptimizableImageSrc(venue.image)}
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                    className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-[#93C5FD]" />
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#111827]/55 to-transparent" />
              </div>

              <div className="flex flex-1 flex-col gap-4 p-5">
                <div className="flex min-h-[112px] flex-col">
                  <div className="mb-3 flex min-h-[28px] flex-wrap items-start gap-2">
                    {uniqueDetailTags.length > 0 ? (
                      uniqueDetailTags.map((detailTag) => (
                        <span
                          key={`${id}-${detailTag}`}
                          className="inline-flex max-w-full items-center rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1 text-xs font-extrabold text-[#1D4ED8]"
                        >
                          <span className="truncate">{detailTag}</span>
                        </span>
                      ))
                    ) : (
                      <span className="inline-flex max-w-full items-center rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1 text-xs font-extrabold text-[#1D4ED8]">
                        Venue
                      </span>
                    )}
                    <span className="inline-flex shrink-0 items-center gap-1 py-1 text-xs font-bold text-amber-700">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {typeof venue.rating === "number"
                        ? venue.rating.toFixed(1)
                        : "New"}
                    </span>
                  </div>

                  <h2 className="line-clamp-2 min-h-[48px] text-lg font-black leading-6 tracking-[-0.03em] text-[#111827] transition group-hover:text-[#1D4ED8]">
                    {venue.name}
                  </h2>
                </div>

                <div className="grid min-h-[58px] content-start gap-2.5 text-sm text-[#6B7280]">
                  <div className="flex min-w-0 items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />
                    <span className="min-w-0 truncate font-semibold">
                      {venue.location}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#2563EB]" />
                    <span className="font-semibold">{venue.capacity}</span>
                  </div>
                </div>

                <div className="mt-auto grid gap-3 border-t border-[#E5E7EB] pt-4">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#6B7280]">
                      Starts at
                    </p>
                    <p className="text-lg font-black text-slate-950">{venue.price}</p>
                  </div>

                  <span className="inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[#2563EB] px-4 text-center text-xs font-black uppercase tracking-[0.08em] text-white shadow-sm shadow-[#2563EB]/20 transition group-hover:bg-[#1D4ED8]">
                    View Details
                  </span>
                </div>
              </div>
            </Link>

            <button
              type="button"
              onClick={(event) => handleUnfavorite(event, id)}
              disabled={isPending}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm backdrop-blur-md transition hover:scale-105 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 disabled:cursor-wait disabled:opacity-70"
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
