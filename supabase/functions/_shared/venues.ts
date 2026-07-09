/** Shared row -> API payload mapper for public.search_venues() RPC results. */
export function toVenuePayload(venue: any) {
  return {
    id: venue.id,
    name: venue.name,
    slug: venue.slug,
    city: venue.city,
    province: venue.province,
    municipality: venue.municipality,
    basePrice: venue.base_price === null ? null : Number(venue.base_price),
    capacityMin: venue.capacity_min === null ? null : Number(venue.capacity_min),
    capacityMax: venue.capacity_max === null ? null : Number(venue.capacity_max),
    indoorOutdoor: venue.indoor_outdoor,
    parkingAvailable: venue.parking_available,
    petFriendly: venue.pet_friendly,
    wheelchairAccessible: venue.wheelchair_accessible,
    avgRating: venue.avg_rating === null ? null : Number(venue.avg_rating),
    similarity: venue.similarity === null ? null : Number(venue.similarity ?? 0),
    relevanceScore:
      venue.relevance_score === null ? null : Number(venue.relevance_score ?? 0),
    categories: venue.categories ?? [],
    amenities: venue.amenities ?? [],
    eventTypes: venue.event_types ?? [],
  };
}
