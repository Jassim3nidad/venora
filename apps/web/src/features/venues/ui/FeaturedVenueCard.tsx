"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Image as ImageIcon, MapPin, Scale, Star, Users } from "lucide-react";
import { useAuthRequiredPrompt } from "@/components/layout/AuthRequiredPrompt";
import { toggleFavoriteAction } from "../application/actions";
import type { Venue } from "../utils/venue-mappers";
import { isOptimizableImageSrc } from "@/src/lib/image-host";
import { useVenueComparison } from "../hooks/useVenueComparison";

interface FeaturedVenueCardProps {
  venue: Venue;
  isAuthenticated: boolean;
}

export default function FeaturedVenueCard({
  venue,
  isAuthenticated,
}: FeaturedVenueCardProps) {
  const { openAuthPrompt, authPrompt } = useAuthRequiredPrompt("/", "favorites");
  const { addVenueId, removeVenueId, isInComparison } = useVenueComparison();
  const isCompared = isInComparison(String(venue.id));
  const [isFavorited, setIsFavorited] = useState(
    Boolean(venue.isFavorited),
  );
  const [isPending, setIsPending] = useState(false);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const settingLabel =
    venue.indoorOutdoor === "both"
      ? "Indoor & Outdoor"
      : venue.indoorOutdoor === "outdoor"
        ? "Outdoor"
        : venue.indoorOutdoor === "indoor"
          ? "Indoor"
          : venue.category ||
            venue.categories?.[0] ||
            venue.eventTypes?.[0] ||
            "Event venue";

  const handleFavoriteToggle = async (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      openAuthPrompt(`/venues/${venue.slug ?? venue.id}`);
      return;
    }

    const previousIsFavorited = isFavorited;
    setFavoriteError(null);
    setIsFavorited(!previousIsFavorited);
    setIsPending(true);

    const result = await toggleFavoriteAction({ venueId: String(venue.id) });

    setIsPending(false);
    if (result.error) {
      setIsFavorited(previousIsFavorited);
      setFavoriteError(
        result.error.message || "Unable to update favorites. Please try again.",
      );
      return;
    }

    setIsFavorited(Boolean(result.data?.isFavorited));
  };

  return (
    <article className="group relative flex h-full overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white shadow-sm shadow-slate-200/70 transition duration-300 hover:-translate-y-[2px] hover:border-[#BFDBFE] hover:shadow-xl hover:shadow-slate-200/80">
      <Link
        className="flex min-w-0 flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
        href={`/venues/${venue.slug ?? venue.id}`}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-[#EFF6FF]">
          {venue.image ? (
            <Image
              fill
              src={venue.image}
              alt={venue.name}
              loading="eager"
              priority
              unoptimized={!isOptimizableImageSrc(venue.image)}
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition duration-500 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="h-8 w-8 text-[#93C5FD]" />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="line-clamp-2 text-lg font-bold leading-6 text-[#111827] transition group-hover:text-[#1D4ED8]">
                {venue.name}
              </h3>
              <span className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-[#111827]">
                <Star className="h-4 w-4 fill-[#111827] text-[#111827]" />
                {typeof venue.rating === "number"
                  ? venue.rating.toFixed(1)
                  : "New"}
              </span>
            </div>

            <p className="flex min-w-0 items-center gap-1.5 text-sm text-[#434654]">
              <MapPin className="h-4 w-4 shrink-0 text-[#2563EB]" />
              <span className="min-w-0 truncate font-medium">
                {venue.location}
              </span>
            </p>

            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-[#F0F3FF] px-2.5 py-1.5 text-xs font-medium text-[#434654]">
                <Users className="h-4 w-4 shrink-0 text-[#2563EB]" />
                <span className="truncate">{venue.capacity}</span>
              </span>
              <span className="inline-flex max-w-full items-center rounded-lg bg-[#F0F3FF] px-2.5 py-1.5 text-xs font-medium text-[#434654]">
                <span className="truncate">{settingLabel}</span>
              </span>
            </div>
          </div>

          <div className="mt-auto border-t border-[#E5E7EB] pt-3">
            <p className="text-base font-medium text-[#434654]">
              Starting at{" "}
              <span className="text-xl font-bold text-[#111827]">
                {venue.price}
              </span>
            </p>
          </div>
        </div>
      </Link>

      <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (isCompared) {
              removeVenueId(String(venue.id));
            } else {
              addVenueId(String(venue.id));
            }
          }}
          aria-pressed={isCompared}
          aria-label={
            isCompared
              ? `Remove ${venue.name} from comparison`
              : `Add ${venue.name} to comparison`
          }
          className={`flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-semibold shadow-sm backdrop-blur transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 ${
            isCompared
              ? "bg-rose-600 text-white"
              : "bg-white/90 text-slate-700 hover:bg-slate-100"
          }`}
        >
          <Scale className="h-3.5 w-3.5" />
          <span>{isCompared ? "Comparing" : "Compare"}</span>
        </button>

        <button
          type="button"
          onClick={handleFavoriteToggle}
          disabled={isPending}
          aria-pressed={isFavorited}
          aria-label={
            isFavorited
              ? `Remove ${venue.name} from favorites`
              : `Add ${venue.name} to favorites`
          }
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm backdrop-blur transition-all duration-150 hover:text-red-500 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 disabled:cursor-wait disabled:opacity-70"
        >
          <Heart
            className={`h-4 w-4 transition ${
              isFavorited ? "fill-red-500 text-red-500" : ""
            }`}
          />
        </button>
      </div>

      {favoriteError ? (
        <p
          role="alert"
          className="absolute inset-x-3 bottom-3 z-20 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 shadow-sm"
        >
          {favoriteError}
        </p>
      ) : null}

      {authPrompt}
    </article>
  );
}
