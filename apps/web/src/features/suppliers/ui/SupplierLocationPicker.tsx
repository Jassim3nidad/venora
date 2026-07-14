"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Crosshair, MapPin } from "lucide-react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type SupplierLocationPickerProps = {
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  fallbackLatitude?: number | null;
  fallbackLongitude?: number | null;
  radiusKm?: number | null;
  onLocationChange?: (lat: number | null, lng: number | null) => void;
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

export default function SupplierLocationPicker({
  initialLatitude,
  initialLongitude,
  fallbackLatitude,
  fallbackLongitude,
  radiusKm,
  onLocationChange,
}: SupplierLocationPickerProps) {
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
    
    if (onLocationChange) {
      onLocationChange(roundedLatitude, roundedLongitude);
    }

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
      attributionControl: { compact: true },
    });

    mapRef.current = map;
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );

    const el = document.createElement("div");
    el.className = "supplier-location-picker-marker";
    el.style.width = "26px";
    el.style.height = "26px";
    el.style.borderRadius = "9999px";
    el.style.backgroundColor = "#9333ea"; // Purple for suppliers, diff from venues
    el.style.border = "4px solid #ffffff";
    el.style.boxShadow = "0 10px 24px rgba(147, 51, 234, 0.35)";
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
    // MapLibre owns updates after mount
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
    <section className="rounded-2xl border border-purple-200 bg-purple-50/50 p-3 w-full">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-purple-600 shadow-sm">
            <MapPin className="h-3.5 w-3.5" />
            Supplier Location Map
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-[#4B5563]">
            Click the map or drag the marker to set your business coordinates.
            {radiusKm ? ` Your service radius of ${radiusKm}km applies from this point.` : ""}
          </p>
        </div>

        <button
          type="button"
          onClick={useCurrentMapCenter}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-purple-200 bg-white px-3 text-xs font-extrabold text-purple-700 transition hover:bg-purple-50"
        >
          <Crosshair className="h-4 w-4" />
          Use map center
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-purple-200 bg-white shadow-sm">
        <div
          ref={mapContainerRef}
          role="region"
          aria-label="Supplier location picker map — click or drag the marker to set coordinates"
          className="h-[320px] w-full"
        />
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-semibold text-[#374151]">
          Latitude
          <input
            type="number"
            step="any"
            min="-90"
            max="90"
            name="latitude"
            value={latitudeInput}
            onChange={(event) => setLatitudeInput(event.target.value)}
            onBlur={handleLatitudeBlur}
            placeholder="14.599500"
            className="h-11 rounded-xl border border-[#e5e7eb] bg-white px-3 text-sm text-[#111827] outline-none transition placeholder:text-[#9ca3af] focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-[#374151]">
          Longitude
          <input
            type="number"
            step="any"
            min="-180"
            max="180"
            name="longitude"
            value={longitudeInput}
            onChange={(event) => setLongitudeInput(event.target.value)}
            onBlur={handleLongitudeBlur}
            placeholder="120.984200"
            className="h-11 rounded-xl border border-[#e5e7eb] bg-white px-3 text-sm text-[#111827] outline-none transition placeholder:text-[#9ca3af] focus:border-purple-600 focus:ring-4 focus:ring-purple-100"
          />
        </label>
      </div>
    </section>
  );
}
