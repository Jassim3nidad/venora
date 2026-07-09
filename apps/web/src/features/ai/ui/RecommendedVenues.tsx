"use client";

import Link from "next/link";
import Image from "next/image";
import { Sparkles, MapPin, Star, Image as ImageIcon, RefreshCw } from "lucide-react";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { useVenueRecommendations } from "../hooks/use-venue-recommendations";
import { recordRecommendationClick } from "../api/ai-recommendation.client";

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
          className="h-64 animate-pulse rounded-[24px] border border-[var(--border-default)] bg-[var(--bg-subtle)]"
        />
      ))}
    </div>
  );
}

export default function RecommendedVenues() {
  const { user, loading: userLoading } = useCurrentUser();
  const { data, isLoading, isError, error, refetch, isFetching } =
    useVenueRecommendations(user?.id ?? null);

  if (userLoading || !user) return null;
  if (!isLoading && !isError && (data?.venues.length ?? 0) === 0) return null;

  return (
    <section className="space-y-6 pt-8 border-t border-[var(--border-default)]">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <h3 className="flex items-center gap-1.5 font-sora text-xl font-bold tracking-tight text-[var(--text-primary)]">
            <Sparkles className="h-5 w-5 text-[#2563EB]" />
            Recommended for You
          </h3>
          <p className="text-xs font-medium text-[var(--text-muted)]">
            {data?.mode === "cold_start"
              ? "Popular venues to help you get started."
              : "Based on venues you've booked and favorited."}
          </p>
        </div>
        {isError && (
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Retry
          </button>
        )}
      </div>

      {isLoading ? (
        <RecommendedVenuesSkeleton />
      ) : isError ? (
        <div className="rounded-2xl border border-red-200/40 bg-red-500/5 p-4 text-xs font-medium text-red-600">
          {error?.message ?? "Could not load recommendations."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {data!.venues.map((venue) => {
            const eventId = data!.recommendationEventIds[venue.id];

            return (
              <Link
                key={venue.id}
                href={`/venues/${venue.slug ?? venue.id}`}
                onClick={() => {
                  if (eventId) void recordRecommendationClick(eventId);
                }}
                className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-[#E5E7EB] bg-white shadow-sm shadow-slate-200/50 transition-all hover:-translate-y-1 hover:border-[#BFDBFE] hover:shadow-xl hover:shadow-slate-200/70"
              >
                <div className="relative aspect-[16/10] w-full flex-shrink-0 overflow-hidden bg-slate-100">
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-slate-300" />
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-between space-y-3 p-5">
                  <div className="space-y-1">
                    <h4 className="line-clamp-2 text-base font-extrabold leading-snug tracking-[-0.02em] text-slate-950 transition-colors group-hover:text-[#1D4ED8]">
                      {venue.name}
                    </h4>
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-[#2563EB]" />
                      <span className="line-clamp-1">
                        {venue.city}, {venue.province}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-sm font-semibold">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-amber-400 stroke-amber-400" />
                      <span className="text-[var(--text-primary)]">
                        {venue.avgRating?.toFixed(1) ?? "New"}
                      </span>
                    </div>
                    <span className="text-[var(--text-primary)]">
                      {formatCurrency(venue.basePrice)}
                    </span>
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
