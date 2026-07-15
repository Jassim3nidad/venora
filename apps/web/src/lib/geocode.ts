type GeocodePrecision = "exact" | "city" | "province";

interface GeocodeResult {
  latitude: number;
  longitude: number;
  precision: GeocodePrecision;
}

async function nominatimSearch(
  query: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.append("q", query);
  url.searchParams.append("format", "json");
  url.searchParams.append("limit", "1");
  url.searchParams.append("countrycodes", "ph");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "User-Agent": "VenoraApp/1.0 (contact@venora.app)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    console.error(
      "OSM Nominatim API error:",
      response.status,
      response.statusText,
    );
    return null;
  }

  const data = await response.json();

  if (data && data.length > 0) {
    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
    };
  }

  return null;
}

function extractPrimaryCity(city: string | null | undefined): string {
  if (!city) return "";
  return city.split("(")[0]?.split(",")[0]?.trim() ?? "";
}

export async function geocodeAddress(
  address: string,
  city: string,
  province: string,
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const result = await geocodeVenueLocation({ address, city, province });
    if (!result) return null;

    return {
      latitude: result.latitude,
      longitude: result.longitude,
    };
  } catch (error) {
    console.error("Error geocoding address:", error);
    return null;
  }
}

export async function geocodeVenueLocation(venue: {
  address?: string | null | undefined;
  city?: string | null | undefined;
  municipality?: string | null | undefined;
  province?: string | null | undefined;
}): Promise<GeocodeResult | null> {
  try {
    const city = extractPrimaryCity(venue.city) || venue.municipality || "";
    const province = venue.province?.trim() ?? "";
    const address = venue.address?.trim() ?? "";

    const queries: Array<{ query: string; precision: GeocodePrecision }> = [];

    if (address && city && province) {
      queries.push({
        query: `${address}, ${city}, ${province}, Philippines`,
        precision: "exact",
      });
    }

    if (city && province) {
      queries.push({
        query: `${city}, ${province}, Philippines`,
        precision: "city",
      });
    }

    if (province) {
      queries.push({
        query: `${province}, Philippines`,
        precision: "province",
      });
    }

    for (const { query, precision } of queries) {
      const result = await nominatimSearch(query);
      if (result) {
        return { ...result, precision };
      }
    }

    return null;
  } catch (error) {
    console.error("Error geocoding venue location:", error);
    return null;
  }
}
