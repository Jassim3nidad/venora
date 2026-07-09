"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, MapPin } from "lucide-react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type VenueLocationPickerProps = {
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  fallbackLatitude?: number | null;
  fallbackLongitude?: number | null;
};

const DEFAULT_CENTER = {
  latitude: 14.5995,
  longitude: 120.9842,
};

function toInputValue(value: number | null) {
  return value == null ? "" : value.toFixed(6);
}

function parseCoordinate(value: string, min: number, max: number) {
  if (value.trim() === "") return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return null;

  return parsed;
}

export default function VenueLocationPicker({
  initialLatitude,
  initialLongitude,
  fallbackLatitude,
  fallbackLongitude,
}: VenueLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  const initialPoint =
    initialLatitude != null && initialLongitude != null
      ? { latitude: initialLatitude, longitude: initialLongitude }
      : null;

  const fallbackPoint =
    fallbackLatitude != null && fallbackLongitude != null
      ? { latitude: fallbackLatitude, longitude: fallbackLongitude }
      : DEFAULT_CENTER;

  const [latitude, setLatitude] = useState<number | null>(
    initialPoint?.latitude ?? null,
  );
  const [longitude, setLongitude] = useState<number | null>(
    initialPoint?.longitude ?? null,
  );
  const [latitudeInput, setLatitudeInput] = useState(toInputValue(latitude));
  const [longitudeInput, setLongitudeInput] = useState(toInputValue(longitude));

  const center = useMemo(
    () => ({
      latitude: latitude ?? fallbackPoint.latitude,
      longitude: longitude ?? fallbackPoint.longitude,
    }),
    [fallbackPoint.latitude, fallbackPoint.longitude, latitude, longitude],
  );

  function setPoint(nextLatitude: number, nextLongitude: number) {
    const roundedLatitude = Number(nextLatitude.toFixed(6));
    const roundedLongitude = Number(nextLongitude.toFixed(6));

    setLatitude(roundedLatitude);
    setLongitude(roundedLongitude);
    setLatitudeInput(toInputValue(roundedLatitude));
    setLongitudeInput(toInputValue(roundedLongitude));

    markerRef.current?.setLngLat([roundedLongitude, roundedLatitude]);
    mapRef.current?.flyTo({
      center: [roundedLongitude, roundedLatitude],
      zoom: Math.max(mapRef.current.getZoom(), 14),
      essential: true,
    });
  }

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [center.longitude, center.latitude],
      zoom: initialPoint ? 14 : 11,
      attributionControl: false,
    });

    mapRef.current = map;
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );

    const el = document.createElement("div");
    el.className = "venue-location-picker-marker";
    el.style.width = "26px";
    el.style.height = "26px";
    el.style.borderRadius = "9999px";
    el.style.backgroundColor = "#2563EB";
    el.style.border = "4px solid #ffffff";
    el.style.boxShadow = "0 10px 24px rgba(37, 99, 235, 0.35)";
    el.style.cursor = "grab";

    const marker = new maplibregl.Marker({
      element: el,
      draggable: true,
    })
      .setLngLat([center.longitude, center.latitude])
      .addTo(map);

    markerRef.current = marker;

    marker.on("dragstart", () => {
      el.style.cursor = "grabbing";
    });

    marker.on("dragend", () => {
      el.style.cursor = "grab";
      const nextPoint = marker.getLngLat();
      setPoint(nextPoint.lat, nextPoint.lng);
    });

    map.on("click", (event) => {
      setPoint(event.lngLat.lat, event.lngLat.lng);
    });

    return () => {
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // MapLibre owns updates after mount; dependency changes should not recreate map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLatitudeBlur() {
    const nextLatitude = parseCoordinate(latitudeInput, -90, 90);
    const nextLongitude = parseCoordinate(longitudeInput, -180, 180);

    if (nextLatitude != null && nextLongitude != null) {
      setPoint(nextLatitude, nextLongitude);
    }
  }

  function handleLongitudeBlur() {
    handleLatitudeBlur();
  }

  function useCurrentMapCenter() {
    const currentCenter = mapRef.current?.getCenter();
    if (!currentCenter) return;

    setPoint(currentCenter.lat, currentCenter.lng);
  }

  return (
    <section className="rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF]/50 p-3 sm:col-span-2">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#2563EB] shadow-sm">
            <MapPin className="h-3.5 w-3.5" />
            Venue map point
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#4B5563]">
            Click the map or drag the marker to set the exact customer-facing
            venue location.
          </p>
        </div>

        <button
          type="button"
          onClick={useCurrentMapCenter}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#BFDBFE] bg-white px-3 text-xs font-extrabold text-[#1D4ED8] transition hover:bg-[#EFF6FF]"
        >
          <Crosshair className="h-4 w-4" />
          Use map center
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#BFDBFE] bg-white shadow-sm">
        <div ref={mapContainerRef} className="h-[320px] w-full" />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-semibold text-[#374151]">
          Map latitude
          <input
            id="edit-venue-latitude"
            type="number"
            step="any"
            min="-90"
            max="90"
            name="latitude"
            value={latitudeInput}
            onChange={(event) => setLatitudeInput(event.target.value)}
            onBlur={handleLatitudeBlur}
            placeholder="14.599500"
            className="h-11 rounded-xl border border-[#e5e7eb] bg-white px-3 text-sm text-[#111827] outline-none transition placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:ring-4 focus:ring-[#eff6ff]"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-[#374151]">
          Map longitude
          <input
            id="edit-venue-longitude"
            type="number"
            step="any"
            min="-180"
            max="180"
            name="longitude"
            value={longitudeInput}
            onChange={(event) => setLongitudeInput(event.target.value)}
            onBlur={handleLongitudeBlur}
            placeholder="120.984200"
            className="h-11 rounded-xl border border-[#e5e7eb] bg-white px-3 text-sm text-[#111827] outline-none transition placeholder:text-[#9ca3af] focus:border-[#2563eb] focus:ring-4 focus:ring-[#eff6ff]"
          />
        </label>
      </div>
    </section>
  );
}
