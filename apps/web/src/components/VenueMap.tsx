"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface VenueMapProps {
  latitude: number;
  longitude: number;
  zoom?: number;
  interactive?: boolean;
  markerLabel?: string;
  height?: string;
}

export default function VenueMap({
  latitude,
  longitude,
  zoom = 14,
  interactive = true,
  markerLabel,
  height = "350px",
}: VenueMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize MapLibre GL map
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [longitude, latitude],
      zoom: zoom,
      interactive: interactive,
      attributionControl: false,
    });

    mapRef.current = map;

    // Add navigation controls (zoom in/out) if interactive
    if (interactive) {
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    }

    // Create custom blue brand marker pin
    const el = document.createElement("div");
    el.className = "venue-map-marker";
    el.style.width = "24px";
    el.style.height = "24px";
    el.style.borderRadius = "50%";
    el.style.backgroundColor = "hsl(217 91% 55%)";
    el.style.border = "3px solid #fff";
    el.style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.4)";
    el.style.cursor = "pointer";

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([longitude, latitude])
      .addTo(map);

    // Add a popup tooltip if a label is provided
    if (markerLabel) {
      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(
        `<div style="font-family: var(--font-inter, sans-serif); font-size: 13px; font-weight: 600; padding: 4px 8px; color: var(--text-primary);">${markerLabel}</div>`
      );
      marker.setPopup(popup);
    }

    // Cleanup map instance on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [latitude, longitude, zoom, interactive, markerLabel]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: height,
        borderRadius: "1rem",
        overflow: "hidden",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
