"use client";

import dynamic from "next/dynamic";

const VenueMap = dynamic(() => import("@/src/components/VenueMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] w-full rounded-3xl bg-slate-100 animate-pulse" />
  ),
});

export function BookingVenueMap({
  latitude,
  longitude,
  zoom,
  markerLabel = "Venue",
}: {
  latitude: number;
  longitude: number;
  zoom: number;
  markerLabel?: string;
}) {
  return (
    <VenueMap
      latitude={latitude}
      longitude={longitude}
      zoom={zoom}
      markerLabel={markerLabel}
    />
  );
}
