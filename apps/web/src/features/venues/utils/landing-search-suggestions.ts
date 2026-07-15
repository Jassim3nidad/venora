export interface SuggestionVenue {
  id?: string | number | undefined;
  location?: string | null;
  eventTypes?: string[] | null;
}

export function mergeLandingSearchSuggestionSources(
  liveVenues: SuggestionVenue[],
  fallbackVenues: SuggestionVenue[],
) {
  const liveVenueIds = new Set(
    liveVenues
      .map((venue) => venue.id)
      .filter((id): id is string | number => id !== undefined)
      .map(String),
  );

  return [
    ...liveVenues,
    ...fallbackVenues.filter(
      (venue) =>
        venue.id === undefined || !liveVenueIds.has(String(venue.id)),
    ),
  ];
}

function uniqueSorted(values: Array<string | null | undefined>) {
  const valuesByNormalizedLabel = new Map<string, string>();

  for (const value of values) {
    const label = value?.trim();
    if (!label) continue;

    const normalized = label.toLocaleLowerCase("en-PH");
    if (!valuesByNormalizedLabel.has(normalized)) {
      valuesByNormalizedLabel.set(normalized, label);
    }
  }

  return [...valuesByNormalizedLabel.values()].sort((left, right) =>
    left.localeCompare(right, "en-PH"),
  );
}

export function buildLandingSearchSuggestions(venues: SuggestionVenue[]) {
  return {
    locations: uniqueSorted(venues.map((venue) => venue.location)),
    eventTypes: uniqueSorted(
      venues.flatMap((venue) => venue.eventTypes ?? []),
    ),
  };
}

export function filterLandingSearchSuggestions(
  options: string[],
  query: string,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase("en-PH");
  if (!normalizedQuery) return options;

  return options.filter((option) =>
    option.toLocaleLowerCase("en-PH").includes(normalizedQuery),
  );
}
