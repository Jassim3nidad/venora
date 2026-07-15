import type { VenueMedia } from "../types/venue.types";

const DEFAULT_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://szmjjkywcsnzkgqevinz.supabase.co";

export function getVenueMediaUrl(
  path: string,
  supabaseUrl = DEFAULT_SUPABASE_URL,
): string {
  if (path.startsWith("http") || path.startsWith("/")) return path;
  return `${supabaseUrl}/storage/v1/object/public/venue-images/${path}`;
}

export function sortVenueMedia(media: VenueMedia[]): VenueMedia[] {
  return [...media].sort((a, b) => a.display_order - b.display_order);
}

export function pickFeaturedMedia(media: VenueMedia[]): VenueMedia | null {
  const images = pickGalleryImages(media);
  if (images.length === 0) return null;
  return images.find((item) => item.is_featured) ?? images[0] ?? null;
}

export function pickPromotionalVideo(media: VenueMedia[]): VenueMedia | null {
  return (
    sortVenueMedia(media).find((item) => item.media_type === "video") ?? null
  );
}

export function pickGalleryImages(media: VenueMedia[]): VenueMedia[] {
  return sortVenueMedia(media).filter((item) => item.media_type === "image");
}

export function formatPriceUnit(unit: string): string {
  switch (unit) {
    case "per_event":
      return "event";
    case "per_hour":
      return "hour";
    case "per_pax":
      return "guest";
    case "per_day":
    default:
      return "day";
  }
}
