"use client";

import { Heart, Share2, MapPin, Star, Flame } from "lucide-react";
import { Badge, Button } from "@venora/ui";
import type { VenueProfileData } from "../types/venue.types";

interface VenueProfileCardProps {
  venue: VenueProfileData;
  isFavorited: boolean;
  isTogglingFavorite: boolean;
  onShare: () => void;
  onFavoriteToggle: () => void;
}

export default function VenueProfileCard({
  venue,
  isFavorited,
  isTogglingFavorite,
  onShare,
  onFavoriteToggle,
}: VenueProfileCardProps) {
  const rating = venue.avg_rating ?? 0;
  const reviewCount = venue.review_count ?? 0;
  const hostName = venue.organizations?.name ?? "Venora Host";

  return (
    <section className="space-y-4 border-b border-[var(--border-default)] pb-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {venue.indoor_outdoor && (
              <Badge
                variant="outline"
                className="border-[var(--color-brand-500)]/20 bg-[var(--bg-subtle)] text-[10px] font-medium uppercase tracking-wider text-[var(--color-brand-600)]"
              >
                {venue.indoor_outdoor}
              </Badge>
            )}
            {venue.is_featured && (
              <Badge className="flex items-center gap-1 bg-amber-500 text-[10px] font-semibold text-white">
                <Flame className="h-3 w-3 fill-current" />
                Featured
              </Badge>
            )}
          </div>

          <h1 className="font-sora text-[26px] font-extrabold leading-tight tracking-tight text-[var(--text-primary)] md:text-[32px]">
            {venue.name}
          </h1>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-medium text-[var(--text-secondary)]">
            {reviewCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[var(--text-primary)]">
                <Star className="h-4 w-4 fill-amber-400 stroke-amber-400" />
                {rating.toFixed(1)}
                <span className="text-[var(--text-muted)]">
                  · {reviewCount} review{reviewCount === 1 ? "" : "s"}
                </span>
              </span>
            )}
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
              <span className="truncate">
                {venue.city}, {venue.province}
              </span>
            </span>
          </div>

          <p className="text-sm text-[var(--text-secondary)]">
            Event venue hosted by{" "}
            <span className="font-semibold text-[var(--text-primary)]">{hostName}</span>
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          <Button
            onClick={onShare}
            variant="outline"
            className="h-10 rounded-xl border-[var(--border-default)] px-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] md:h-11 md:px-4"
          >
            <Share2 className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Share</span>
          </Button>
          <Button
            onClick={onFavoriteToggle}
            variant="outline"
            disabled={isTogglingFavorite}
            className={`h-10 rounded-xl border-[var(--border-default)] px-3 text-sm font-semibold transition-all md:h-11 md:px-4 ${
              isFavorited
                ? "border-red-200 bg-red-50/50 text-red-500"
                : "text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
            }`}
          >
            <Heart className={`h-4 w-4 md:mr-2 ${isFavorited ? "fill-current" : ""}`} />
            <span className="hidden md:inline">
              {isFavorited ? "Saved" : "Save"}
            </span>
          </Button>
        </div>
      </div>
    </section>
  );
}
