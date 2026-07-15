"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Image as ImageIcon, MapPin, Star } from "lucide-react";
import { toggleFavoriteAction } from "../application/actions";
import type { Venue } from "../utils/venue-mappers";
import { isOptimizableImageSrc } from "@/src/lib/image-host";

interface FeaturedVenueCardProps {
  venue: Venue;
  isAuthenticated: boolean;
}

export default function FeaturedVenueCard({
  venue,
  isAuthenticated,
}: FeaturedVenueCardProps) {
  const router = useRouter();
  const [isFavorited, setIsFavorited] = useState(
    Boolean(venue.isFavorited),
  );
  const [isPending, setIsPending] = useState(false);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);

  const handleFavoriteToggle = async (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      router.push("/login?redirectTo=%2F&prompt=favorites");
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
    <article className="group relative flex h-full overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 hover:border-[#2563EB]/50 hover:shadow-xl hover:shadow-slate-200/80">
      <Link
        className="flex min-w-0 flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
        href={`/venues/${venue.slug ?? venue.id}`}
      >
        <div className="relative h-52 w-full overflow-hidden bg-slate-100">
          {venue.image ? (
            <Image
              fill
              src={venue.image}
              alt={`${venue.name} in ${venue.location}`}
              unoptimized={!isOptimizableImageSrc(venue.image)}
              sizes="(max-width: 768px) 100vw, 33vw"
              className="object-cover transition duration-700 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageIcon className="h-8 w-8 text-slate-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-transparent" />
          <div className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.1em] text-[#1D4ED8] shadow-sm backdrop-blur">
            {venue.category ?? "Venue"}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-5">
          <div className="mb-2 flex items-start justify-between gap-3">
            <h3 className="text-lg font-black tracking-[-0.03em] text-[#111827]">
              {venue.name}
            </h3>
            <div className="flex shrink-0 items-center gap-1 text-sm font-extrabold text-[#111827]">
              <Star className="h-4 w-4 fill-[#F59E0B] text-[#F59E0B]" />
              {typeof venue.rating === "number"
                ? venue.rating.toFixed(1)
                : "New"}
            </div>
          </div>
          <p className="mb-5 flex items-center gap-1.5 text-sm font-semibold text-[#6B7280]">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{venue.location}</span>
          </p>
          <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
            <p className="text-base font-black text-[#111827]">{venue.price}</p>
            <span className="text-sm font-extrabold text-[#2563EB]">
              View details
            </span>
          </div>
        </div>
      </Link>

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
        className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm backdrop-blur transition hover:scale-105 hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 disabled:cursor-wait disabled:opacity-70"
      >
        <Heart
          className={`h-4 w-4 transition ${
            isFavorited ? "fill-red-500 text-red-500" : ""
          }`}
        />
      </button>

      {favoriteError ? (
        <p
          role="alert"
          className="absolute inset-x-3 bottom-3 z-20 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 shadow-sm"
        >
          {favoriteError}
        </p>
      ) : null}
    </article>
  );
}
