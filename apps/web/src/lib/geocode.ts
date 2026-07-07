export async function geocodeAddress(address: string, city: string, province: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const query = `${address}, ${city}, ${province}`;
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.append("q", query);
    url.searchParams.append("format", "json");
    url.searchParams.append("limit", "1");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        // OSM requires a valid User-Agent to avoid blocking
        "User-Agent": "VenoraApp/1.0 (contact@venora.app)",
      },
      // Since it's an external API that might change or we want fresh results, we don't aggressively cache
      cache: "no-store"
    });

    if (!response.ok) {
      console.error("OSM Nominatim API error:", response.status, response.statusText);
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
  } catch (error) {
    console.error("Error geocoding address:", error);
    return null;
  }
}
