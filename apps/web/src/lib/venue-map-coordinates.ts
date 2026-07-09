import { geocodeVenueLocation } from "@/src/lib/geocode";

export type VenueMapPrecision = "exact" | "city" | "province";

export interface ResolvedVenueMapLocation {
  latitude: number;
  longitude: number;
  precision: VenueMapPrecision;
  zoom: number;
}

const ZOOM_BY_PRECISION: Record<VenueMapPrecision, number> = {
  exact: 14,
  city: 11,
  province: 9,
};

const PH_LAT_MIN = 4.5;
const PH_LAT_MAX = 21.5;
const PH_LNG_MIN = 116;
const PH_LNG_MAX = 127;

const PH_PROVINCE_CENTROIDS: Record<
  string,
  { latitude: number; longitude: number }
> = {
  "metro manila": { latitude: 14.5995, longitude: 120.9842 },
  cavite: { latitude: 14.4791, longitude: 120.897 },
  batangas: { latitude: 13.7565, longitude: 121.0583 },
  laguna: { latitude: 14.2691, longitude: 121.4113 },
  rizal: { latitude: 14.6036, longitude: 121.3084 },
  pampanga: { latitude: 15.0794, longitude: 120.62 },
  bulacan: { latitude: 14.7942, longitude: 120.8799 },
  quezon: { latitude: 14.031, longitude: 121.5884 },
  cebu: { latitude: 10.3157, longitude: 123.8854 },
  bohol: { latitude: 9.8499, longitude: 124.1435 },
  palawan: { latitude: 9.8349, longitude: 118.7384 },
  davao: { latitude: 7.1907, longitude: 125.4553 },
  baguio: { latitude: 16.4023, longitude: 120.596 },
  benguet: { latitude: 16.4023, longitude: 120.596 },
};

const PH_CITY_CENTROIDS: Record<
  string,
  { latitude: number; longitude: number }
> = {
  paranaque: { latitude: 14.4793, longitude: 121.0198 },
  alfonso: { latitude: 14.1398, longitude: 120.8538 },
  nasugbu: { latitude: 14.0678, longitude: 120.6317 },
  tiaong: { latitude: 13.9569, longitude: 121.3235 },
  antipolo: { latitude: 14.6255, longitude: 121.1245 },
  mabalacat: { latitude: 15.186, longitude: 120.537 },
  "clark freeport zone": { latitude: 15.186, longitude: 120.537 },
  "cebu city": { latitude: 10.3157, longitude: 123.8854 },
  cebu: { latitude: 10.3157, longitude: 123.8854 },
  panglao: { latitude: 9.578, longitude: 123.744 },
  "panglao island": { latitude: 9.578, longitude: 123.744 },
  "puerto princesa": { latitude: 9.7392, longitude: 118.7353 },
  "puerto princesa city": { latitude: 9.7392, longitude: 118.7353 },
  samal: { latitude: 7.05, longitude: 125.7333 },
  "island garden city of samal": { latitude: 7.05, longitude: 125.7333 },
  baguio: { latitude: 16.4023, longitude: 120.596 },
  "baguio city": { latitude: 16.4023, longitude: 120.596 },
  tagaytay: { latitude: 14.1153, longitude: 120.9621 },
  makati: { latitude: 14.5547, longitude: 121.0244 },
  manila: { latitude: 14.5995, longitude: 120.9842 },
  quezon: { latitude: 14.676, longitude: 121.0437 },
  pasig: { latitude: 14.5764, longitude: 121.0851 },
};

function normalizeLocationKey(value: string | null | undefined): string {
  if (!value) return "";

  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bcity\b/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractPrimaryCity(city: string | null | undefined): string {
  if (!city) return "";

  return city.split("(")[0]?.split(",")[0]?.trim() ?? "";
}

function isWithinPhilippines(latitude: number, longitude: number): boolean {
  return (
    latitude >= PH_LAT_MIN &&
    latitude <= PH_LAT_MAX &&
    longitude >= PH_LNG_MIN &&
    longitude <= PH_LNG_MAX
  );
}

export function parseVenueCoordinates(
  latitude: unknown,
  longitude: unknown,
): { latitude: number; longitude: number } | null {
  let parsedLatitude =
    typeof latitude === "number" ? latitude : Number(latitude);
  let parsedLongitude =
    typeof longitude === "number" ? longitude : Number(longitude);

  if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
    return null;
  }

  if (parsedLatitude === 0 && parsedLongitude === 0) {
    return null;
  }

  if (Math.abs(parsedLatitude) > 90 && Math.abs(parsedLongitude) <= 90) {
    [parsedLatitude, parsedLongitude] = [parsedLongitude, parsedLatitude];
  }

  if (!isWithinPhilippines(parsedLatitude, parsedLongitude)) {
    return null;
  }

  return { latitude: parsedLatitude, longitude: parsedLongitude };
}

function lookupCityCentroid(venue: {
  city?: string | null;
  municipality?: string | null;
}): { latitude: number; longitude: number } | null {
  const candidates = [
    extractPrimaryCity(venue.city),
    venue.municipality ?? "",
    venue.city ?? "",
  ]
    .map(normalizeLocationKey)
    .filter(Boolean);

  for (const candidate of candidates) {
    if (PH_CITY_CENTROIDS[candidate]) {
      return PH_CITY_CENTROIDS[candidate];
    }
  }

  for (const candidate of candidates) {
    const match = Object.entries(PH_CITY_CENTROIDS).find(([key]) =>
      candidate.includes(key),
    );
    if (match) return match[1];
  }

  return null;
}

function lookupProvinceCentroid(
  province: string | null | undefined,
): { latitude: number; longitude: number } | null {
  const key = normalizeLocationKey(province);
  if (!key) return null;

  return PH_PROVINCE_CENTROIDS[key] ?? null;
}

function toResolvedLocation(
  latitude: number,
  longitude: number,
  precision: VenueMapPrecision,
): ResolvedVenueMapLocation {
  return {
    latitude,
    longitude,
    precision,
    zoom: ZOOM_BY_PRECISION[precision],
  };
}

export async function resolveVenueMapCoordinates(venue: {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  municipality?: string | null;
}): Promise<ResolvedVenueMapLocation | null> {
  const cityCentroid = lookupCityCentroid(venue);
  const provinceCentroid = lookupProvinceCentroid(venue.province);
  const parsed = parseVenueCoordinates(venue.latitude, venue.longitude);

  if (parsed) {
    return toResolvedLocation(parsed.latitude, parsed.longitude, "exact");
  }

  const geocoded = await geocodeVenueLocation({
    address: venue.address,
    city: venue.city,
    municipality: venue.municipality,
    province: venue.province,
  });

  if (geocoded) {
    return toResolvedLocation(
      geocoded.latitude,
      geocoded.longitude,
      geocoded.precision,
    );
  }

  if (cityCentroid) {
    return toResolvedLocation(
      cityCentroid.latitude,
      cityCentroid.longitude,
      "city",
    );
  }

  if (provinceCentroid) {
    return toResolvedLocation(
      provinceCentroid.latitude,
      provinceCentroid.longitude,
      "province",
    );
  }

  return null;
}
