"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  MapPin,
  Star,
  Image as ImageIcon,
  RefreshCw,
} from "lucide-react";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { useVenueRecommendations } from "../hooks/use-venue-recommendations";
import { recordRecommendationClick } from "../api/ai-recommendation.client";
import { isOptimizableImageSrc } from "@/src/lib/image-host";
import { selectRecommendationDisplayVenues } from "../application/recommendation-display";
import type { SmartVenueSearchVenue } from "@/features/search/schemas/search.schema";

function formatCurrency(value: number | null) {
  if (!value || !Number.isFinite(value)) return "Price pending";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

function RecommendedVenuesSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-64 animate-pulse rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]"
        />
      ))}
    </div>
  );
}

export default function RecommendedVenues({
  fallbackVenues = [],
}: {
  fallbackVenues?: SmartVenueSearchVenue[];
}) {
  const { user, loading: userLoading } = useCurrentUser();
  const { data, isLoading, isError, error, refetch, isFetching } =
    useVenueRecommendations(user?.id ?? null);
  const display = selectRecommendationDisplayVenues({
    aiVenues: data?.venues ?? null,
    fallbackVenues,
  });
  const hasFallback = fallbackVenues.length > 0;

  if (userLoading && !hasFallback) return null;
  if (!user && !hasFallback) return null;
  if (!isLoading && !isError && display.venues.length === 0) return null;

  return (
    <section className="space-y-6 border-t border-[#E5E7EB] pt-8">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 text-3xl font-bold tracking-[-0.02em] text-[#151C27]">
            Recommended for You
          </h3>
          <p className="text-sm font-medium text-[#737685]">
            {display.isFallback
              ? "Popular venues to help you keep exploring."
              : data?.mode === "cold_start"
                ? "Popular venues to help you get started."
                : "Based on venues you've booked and favorited."}
          </p>
        </div>
        {isError && user && (
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] px-3 py-2 text-xs font-bold text-[#151C27] hover:bg-[#F9FAFB] disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        )}
      </div>

      {isLoading && user ? (
        <RecommendedVenuesSkeleton />
      ) : isError && display.venues.length === 0 ? (
        <div className="rounded-xl border border-red-200/40 bg-red-500/5 p-4 text-xs font-medium text-red-600">
          {error?.message ?? "Could not load recommendations."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {display.venues.map((venue) => {
            const eventId = data?.recommendationEventIds[venue.id];
            const settingLabel =
              venue.indoorOutdoor === "both"
                ? "Indoor & Outdoor"
                : venue.indoorOutdoor === "outdoor"
                  ? "Outdoor"
                  : venue.indoorOutdoor === "indoor"
                    ? "Indoor"
                    : venue.categories[0] ?? "Event venue";
            const capacityLabel = venue.capacityMax
              ? `Up to ${venue.capacityMax.toLocaleString("en-PH")} pax`
              : null;

            const imgUrl = venue.image
              ? venue.image.startsWith("http")
                ? venue.image
                : `${process.env.NEXT_PUBLIC_SUPABASE_URL || "https://szmjjkywcsnzkgqevinz.supabase.co"}/storage/v1/object/public/venue-images/${venue.image}`
              : null;

            return (
              <Link
                key={venue.id}
                href={`/venues/${venue.slug ?? venue.id}`}
                onClick={() => {
                  if (eventId) void recordRecommendationClick(eventId);
                }}
                className="group flex h-full flex-col overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm transition-all hover:-translate-y-1 hover:border-[#0052CC]"
              >
                <div className="relative aspect-[16/10] w-full flex-shrink-0 overflow-hidden bg-slate-100">
                  {imgUrl ? (
                    <Image
                      src={imgUrl}
                      alt={venue.name}
                      fill
                      unoptimized={!isOptimizableImageSrc(imgUrl)}
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-slate-300" />
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="line-clamp-2 text-base font-bold leading-snug tracking-[-0.02em] text-[#151C27] transition-colors group-hover:text-[#0052CC]">
                        {venue.name}
                      </h4>
                      <span className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-[#151C27]">
                        <Star className="h-4 w-4 fill-[#151C27] stroke-[#151C27]" />
                        {venue.avgRating?.toFixed(1) ?? "New"}
                      </span>
                    </div>
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-[#737685]">
                      <MapPin className="h-4 w-4 shrink-0 text-[#0052CC]" />
                      <span className="line-clamp-1">
                        {venue.city}, {venue.province}
                      </span>
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {capacityLabel ? (
                        <span className="inline-flex max-w-full items-center rounded-lg bg-[#F0F3FF] px-2.5 py-1.5 text-xs font-medium text-[#434654]">
                          <span className="truncate">{capacityLabel}</span>
                        </span>
                      ) : null}
                      <span className="inline-flex max-w-full items-center rounded-lg bg-[#F0F3FF] px-2.5 py-1.5 text-xs font-medium text-[#434654]">
                        <span className="truncate">{settingLabel}</span>
                      </span>
                    </div>
                  </div>

                  <div className="mt-auto border-t border-[#E5E7EB] pt-3">
                    <p className="text-sm font-medium text-[#434654]">
                      Starting at{" "}
                      <span className="text-lg font-bold tracking-[-0.03em] text-[#151C27]">
                        {formatCurrency(venue.basePrice)}
                      </span>
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
