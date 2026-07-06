"use client";

import { type FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Heart,
  Loader2,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Users,
  X,
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import { useSmartVenueSearch } from "@/features/search/hooks/use-smart-venue-search";
import type {
  SmartSearchFilters,
  SmartVenueSearchIntent,
  SmartVenueSearchResponse,
} from "@/features/search/schemas/search.schema";
import { toggleFavoriteAction } from "../application/actions";

export interface Venue {
  id: string | number;
  slug?: string;
  name: string;
  location: string;
  price: string;
  capacity: string;
  image: string;
  rating?: number;
  category?: string;
  city?: string;
  municipality?: string;
  province?: string;
  basePrice?: number;
  budgetRange?: string;
  capacityMin?: number | null;
  capacityMax?: number;
  latitude?: number | null;
  longitude?: number | null;
  indoorOutdoor?: string | null;
  airConditioned?: boolean;
  parkingAvailable?: boolean;
  overnightAccommodation?: boolean;
  petFriendly?: boolean;
  wheelchairAccessible?: boolean;
  hasPool?: boolean;
  ceremonyVenue?: boolean;
  receptionVenue?: boolean;
  eventTypes?: string[];
  categories?: string[];
  amenities?: string[];
  isFavorited?: boolean;
}

const filterKeys = [
  "q",
  "province",
  "city",
  "municipality",
  "location",
  "event",
  "budget",
  "minBudget",
  "maxBudget",
  "capacity",
  "style",
  "venueTypes",
  "indoorOutdoor",
  "amenities",
  "sort",
];

const eventHints: Record<string, string[]> = {
  wedding: ["wedding", "ceremony", "reception", "garden", "estate", "church"],
  birthday: ["birthday", "party", "event", "hall", "restaurant"],
  corporate: ["corporate", "conference", "meeting", "loft", "hall", "hotel"],
  conference: ["conference", "corporate", "meeting", "hall", "hotel"],
  debut: ["debut", "party", "ballroom", "garden", "hall"],
  party: ["party", "event", "hall", "resort", "loft", "restaurant"],
};

const venueTypeValues = [
  "garden",
  "beach",
  "resort",
  "hotel",
  "restaurant",
  "church",
] as const;

type VenueTypeValue = (typeof venueTypeValues)[number];
type IndoorOutdoorValue = "indoor" | "outdoor" | "both";

type LocalSmartSearchIntent = {
  province?: string;
  city?: string;
  municipality?: string;
  eventType?: string;
  minBudget?: number;
  maxBudget?: number;
  capacity?: number;
  venueTypes: string[];
  indoorOutdoor?: IndoorOutdoorValue;
  amenities: string[];
  keyword?: string;
  summary: string[];
};

function normalize(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function parseMoney(value: string) {
  const amount = Number(value.replace(/[^0-9]/g, ""));

  return Number.isFinite(amount) ? amount : 0;
}

function getVenuePrice(venue: Venue) {
  return typeof venue.basePrice === "number"
    ? venue.basePrice
    : parseMoney(venue.price);
}

function getVenueCapacity(venue: Venue) {
  if (typeof venue.capacityMax === "number") return venue.capacityMax;

  const capacity = Number(String(venue.capacity).match(/\d+/)?.[0]);

  return Number.isFinite(capacity) ? capacity : 0;
}

function getVenueCapacityLabel(venue: Venue) {
  const capacity =
    typeof venue.capacityMax === "number"
      ? venue.capacityMax
      : Number(String(venue.capacity).match(/\d+/)?.[0]);

  if (Number.isFinite(capacity) && capacity > 0) {
    return `Up to ${capacity.toLocaleString("en-PH")} pax`;
  }

  return venue.capacity;
}

function textIncludes(value: unknown, query: string) {
  return normalize(value).includes(query);
}

function toVenueTypeValue(value: string): VenueTypeValue | null {
  const normalized = normalize(value).replace(/\s+/g, "-");
  const match = venueTypeValues.find(
    (venueType) =>
      venueType === normalized ||
      normalized.includes(venueType) ||
      venueType.includes(normalized),
  );

  return match ?? null;
}

function isVenueTypeValue(
  value: VenueTypeValue | null,
): value is VenueTypeValue {
  return value !== null;
}

function getVenueSearchText(venue: Venue) {
  return normalize(
    [
      venue.name,
      venue.location,
      venue.category,
      venue.city,
      venue.municipality,
      venue.province,
      venue.indoorOutdoor,
      ...(venue.categories ?? []),
      ...(venue.eventTypes ?? []),
      ...(venue.amenities ?? []),
    ].join(" "),
  );
}

function matchesEventType(venue: Venue, eventType: string) {
  if (!eventType) return true;

  const event = normalize(eventType);
  const declaredEvents = venue.eventTypes?.map(normalize) ?? [];

  if (declaredEvents.some((item) => item === event || item.includes(event))) {
    return true;
  }

  if (event === "wedding" && (venue.ceremonyVenue || venue.receptionVenue)) {
    return true;
  }

  const venueText = getVenueSearchText(venue);
  const hints = eventHints[event] ?? [event];

  return hints.some((hint) => venueText.includes(hint));
}

function matchesBudgetPreset(venue: Venue, budget: string) {
  if (!budget) return true;

  const price = getVenuePrice(venue);
  const normalizedBudget = normalize(budget);

  if (venue.budgetRange && normalize(venue.budgetRange) === normalizedBudget) {
    return true;
  }

  if (price <= 0) return false;

  const underMatch = normalizedBudget.match(/^under-(\d+)$/);
  if (underMatch) return price < Number(underMatch[1]);

  const overMatch = normalizedBudget.match(/^over-(\d+)$/);
  if (overMatch) return price >= Number(overMatch[1]);

  const rangeMatch = normalizedBudget.match(/^range-(\d+)-(\d+)$/);
  if (rangeMatch) {
    return price >= Number(rangeMatch[1]) && price <= Number(rangeMatch[2]);
  }

  if (budget === "under-100k") return price < 100000;
  if (budget === "100k-300k") return price >= 100000 && price <= 300000;
  if (budget === "luxury") return price > 300000;

  return true;
}

function matchesBudgetRange(
  venue: Venue,
  minBudget: string,
  maxBudget: string,
) {
  const price = getVenuePrice(venue);
  const min = Number(minBudget) || 0;
  const max = Number(maxBudget) || 0;

  if (price <= 0 && (min > 0 || max > 0)) return false;
  if (min > 0 && price < min) return false;
  if (max > 0 && price > max) return false;

  return true;
}

function matchesVenueTypes(venue: Venue, venueTypes: string[]) {
  if (venueTypes.length === 0) return true;

  const venueText = getVenueSearchText(venue);
  const requested = venueTypes.map(normalize).filter(Boolean);

  return requested.some((venueType) => {
    const compatibleVenueType = toVenueTypeValue(venueType);

    return (
      venueText.includes(venueType) ||
      (compatibleVenueType ? venueText.includes(compatibleVenueType) : false)
    );
  });
}

function matchesIndoorOutdoor(venue: Venue, indoorOutdoor: string) {
  if (!indoorOutdoor) return true;

  const venueMode = normalize(venue.indoorOutdoor);
  const requested = normalize(indoorOutdoor);

  if (requested === "both") return venueMode === "both";
  return venueMode === requested || venueMode === "both";
}

function matchesAmenity(venue: Venue, amenity: string) {
  const normalizedAmenity = normalize(amenity);
  const amenityText = (venue.amenities ?? []).map(normalize);

  if (normalizedAmenity === "parking") {
    return (
      venue.parkingAvailable ||
      amenityText.some((item) => item.includes("park"))
    );
  }

  if (normalizedAmenity === "aircon") {
    return (
      venue.airConditioned || amenityText.some((item) => item.includes("air"))
    );
  }

  if (normalizedAmenity === "pool") {
    return venue.hasPool || amenityText.some((item) => item.includes("pool"));
  }

  if (normalizedAmenity === "pet friendly") {
    return (
      venue.petFriendly || amenityText.some((item) => item.includes("pet"))
    );
  }

  if (normalizedAmenity === "wheelchair accessible") {
    return (
      venue.wheelchairAccessible ||
      amenityText.some(
        (item) => item.includes("wheelchair") || item.includes("accessible"),
      )
    );
  }

  if (normalizedAmenity === "wifi") {
    return amenityText.some(
      (item) =>
        item.includes("wifi") ||
        item.includes("wi-fi") ||
        item.includes("internet"),
    );
  }

  if (normalizedAmenity === "overnight") {
    return (
      venue.overnightAccommodation ||
      amenityText.some(
        (item) => item.includes("overnight") || item.includes("room"),
      )
    );
  }

  return amenityText.some((item) => item.includes(normalizedAmenity));
}

function formatCurrency(amount: number) {
  return `₱${amount.toLocaleString("en-PH")}`;
}

function getBudgetSummary(filters: {
  budget: string;
  minBudget: string;
  maxBudget: string;
}) {
  const min = Number(filters.minBudget) || 0;
  const max = Number(filters.maxBudget) || 0;

  if (min || max) {
    return `${min ? formatCurrency(min) : "Any"} - ${
      max ? formatCurrency(max) : "No limit"
    }`;
  }

  if (filters.budget === "under-100k") return "Under ₱100k";
  if (filters.budget === "100k-300k") return "₱100k-300k";
  if (filters.budget === "luxury") return "Luxury";
  if (filters.budget) return filters.budget;

  return "";
}

function getIntentSummary(intent: SmartVenueSearchIntent) {
  return [
    intent.keyword && `Keyword: ${intent.keyword}`,
    intent.province,
    intent.city,
    intent.municipality,
    intent.minBudget && `From ${formatCurrency(intent.minBudget)}`,
    intent.maxBudget && `Up to ${formatCurrency(intent.maxBudget)}`,
    intent.guests && `${intent.guests}+ guests`,
    ...intent.venueTypes.map(
      (venueType) => venueType.charAt(0).toUpperCase() + venueType.slice(1),
    ),
    intent.indoorOutdoor &&
      intent.indoorOutdoor.charAt(0).toUpperCase() +
        intent.indoorOutdoor.slice(1),
    intent.parking && "Parking",
    intent.petFriendly && "Pet friendly",
    intent.wheelchairAccessible && "Wheelchair accessible",
  ].filter(Boolean) as string[];
}

function parseLocalCurrencyToken(rawValue: string, suffix = "") {
  const value = Number(rawValue.replace(/,/g, ""));

  if (!Number.isFinite(value) || value <= 0) return undefined;

  const normalizedSuffix = normalize(suffix);
  if (normalizedSuffix === "m" || normalizedSuffix === "million") {
    return Math.round(value * 1_000_000);
  }

  if (normalizedSuffix === "k" || normalizedSuffix === "thousand") {
    return Math.round(value * 1_000);
  }

  return Math.round(value);
}

function detectLocalLocation(text: string, venues: Venue[]) {
  const hints: Pick<
    LocalSmartSearchIntent,
    "province" | "city" | "municipality"
  > = {};

  const locationFields = [
    ["province", "province"],
    ["city", "city"],
    ["municipality", "municipality"],
  ] as const;

  locationFields.forEach(([intentKey, venueKey]) => {
    if (hints[intentKey]) return;

    const match = [
      ...new Set(
        venues
          .map((venue) => venue[venueKey])
          .filter((value): value is string => Boolean(value?.trim())),
      ),
    ]
      .sort((a, b) => b.length - a.length)
      .find((value) => {
        const normalized = normalize(value);
        return normalized.length > 2 && text.includes(normalized);
      });

    if (match) hints[intentKey] = match;
  });

  return hints;
}

function parseLocalSmartSearch(
  query: string,
  venues: Venue[],
): LocalSmartSearchIntent {
  const text = normalize(query);
  const summary: string[] = [];
  const pushSummary = (value?: string | false) => {
    if (value && !summary.includes(value)) summary.push(value);
  };

  const locationHints = detectLocalLocation(text, venues);
  const rangeBudgetMatch = text.match(
    /(?:budget|price|cost)?\s*(?:php|p|peso|pesos|\u20b1)?\s*([0-9][0-9,.]*)(k|m|thousand|million)?\s*(?:-|to)\s*(?:php|p|peso|pesos|\u20b1)?\s*([0-9][0-9,.]*)(k|m|thousand|million)?/,
  );
  const maxBudgetMatch = text.match(
    /(?:under|below|less than|up to|max(?:imum)?|budget(?: is| is only| of| around| about| only)?|price(?: is| is only| of| around| about| only)?|only)\s*(?:php|p|peso|pesos|\u20b1)?\s*([0-9][0-9,.]*)(k|m|thousand|million)?/,
  );
  const minBudgetMatch = text.match(
    /(?:from|above|over|at least|min(?:imum)?)\s*(?:php|p|peso|pesos|\u20b1)?\s*([0-9][0-9,.]*)(k|m|thousand|million)?/,
  );
  const guestMatch = text.match(
    /([0-9][0-9,.]*)\s*(?:guests|guest|pax|people|persons)/,
  );
  const venueTypes = venueTypeValues
    .filter((venueType) => text.includes(venueType))
    .map((venueType) => venueType.charAt(0).toUpperCase() + venueType.slice(1));
  const amenities = [
    text.includes("parking") && "Parking",
    (text.includes("aircon") ||
      text.includes("air conditioned") ||
      text.includes("air-conditioned")) &&
      "Aircon",
    text.includes("pool") && "Pool",
    (text.includes("pet friendly") ||
      text.includes("pet-friendly") ||
      text.includes("pets")) &&
      "Pet Friendly",
    (text.includes("wheelchair") || text.includes("accessible")) &&
      "Wheelchair Accessible",
    (text.includes("wifi") || text.includes("wi-fi")) && "WiFi",
    (text.includes("overnight") ||
      text.includes("rooms") ||
      text.includes("accommodation")) &&
      "Overnight",
  ].filter(Boolean) as string[];
  const eventType = [
    "wedding",
    "birthday",
    "corporate",
    "conference",
    "debut",
    "party",
  ].find((event) => text.includes(event));
  const indoorOutdoor: IndoorOutdoorValue | undefined =
    text.includes("indoor and outdoor") ||
    text.includes("indoor/outdoor") ||
    text.includes("both indoor") ||
    text.includes("both outdoor")
      ? "both"
      : text.includes("outdoor")
        ? "outdoor"
        : text.includes("indoor")
          ? "indoor"
          : undefined;
  const budgetSuffixForRange = rangeBudgetMatch?.[2] || rangeBudgetMatch?.[4];
  const minBudget = rangeBudgetMatch
    ? parseLocalCurrencyToken(rangeBudgetMatch[1] ?? "", budgetSuffixForRange)
    : minBudgetMatch
      ? parseLocalCurrencyToken(minBudgetMatch[1] ?? "", minBudgetMatch[2])
      : undefined;
  const maxBudget = rangeBudgetMatch
    ? parseLocalCurrencyToken(rangeBudgetMatch[3] ?? "", rangeBudgetMatch[4])
    : maxBudgetMatch
      ? parseLocalCurrencyToken(maxBudgetMatch[1] ?? "", maxBudgetMatch[2])
      : undefined;
  const capacity = guestMatch
    ? parseLocalCurrencyToken(guestMatch[1] ?? "")
    : undefined;
  const keywordHints = [
    "rooftop",
    "ballroom",
    "loft",
    "pavilion",
    "chapel",
    "farm",
    "estate",
    "villa",
    "hall",
    "cafe",
    "sea view",
    "mountain view",
  ];
  const keyword =
    keywordHints.find((hint) => text.includes(hint)) ||
    (!locationHints.province &&
    !locationHints.city &&
    !locationHints.municipality &&
    !eventType &&
    !minBudget &&
    !maxBudget &&
    !capacity &&
    venueTypes.length === 0 &&
    !indoorOutdoor &&
    amenities.length === 0
      ? query.trim().slice(0, 120)
      : undefined);

  pushSummary(locationHints.province);
  pushSummary(locationHints.city);
  pushSummary(locationHints.municipality);
  pushSummary(
    eventType
      ? eventType.charAt(0).toUpperCase() + eventType.slice(1)
      : undefined,
  );
  pushSummary(minBudget ? `From ${formatCurrency(minBudget)}` : undefined);
  pushSummary(maxBudget ? `Up to ${formatCurrency(maxBudget)}` : undefined);
  pushSummary(capacity ? `${capacity}+ guests` : undefined);
  venueTypes.forEach(pushSummary);
  pushSummary(
    indoorOutdoor &&
      indoorOutdoor.charAt(0).toUpperCase() + indoorOutdoor.slice(1),
  );
  amenities.forEach(pushSummary);
  pushSummary(keyword && `Keyword: ${keyword}`);

  const intent: LocalSmartSearchIntent = {
    venueTypes,
    amenities,
    summary,
  };

  if (locationHints.province) intent.province = locationHints.province;
  if (locationHints.city) intent.city = locationHints.city;
  if (locationHints.municipality) {
    intent.municipality = locationHints.municipality;
  }
  if (eventType) {
    intent.eventType = eventType.charAt(0).toUpperCase() + eventType.slice(1);
  }
  if (minBudget) intent.minBudget = minBudget;
  if (maxBudget) intent.maxBudget = maxBudget;
  if (capacity) intent.capacity = capacity;
  if (indoorOutdoor) intent.indoorOutdoor = indoorOutdoor;
  if (keyword) intent.keyword = keyword;

  return intent;
}

function toSmartSearchFilters(filters: {
  query: string;
  province: string;
  city: string;
  municipality: string;
  budget: string;
  minBudget: string;
  maxBudget: string;
  capacity: string;
  venueTypes: string[];
  indoorOutdoor: string;
  amenities: string[];
  sort: string;
}): Partial<SmartSearchFilters> {
  const minBudget =
    Number(filters.minBudget) ||
    (filters.budget === "100k-300k"
      ? 100000
      : filters.budget === "luxury"
        ? 300000
        : undefined);
  const maxBudget = Number(filters.maxBudget) || undefined;
  const guests = Number(filters.capacity) || undefined;
  const venueTypes = filters.venueTypes
    .map(toVenueTypeValue)
    .filter(Boolean) as VenueTypeValue[];

  return {
    q: filters.query || undefined,
    keyword: filters.query || undefined,
    province: filters.province || undefined,
    city: filters.city || undefined,
    municipality: filters.municipality || undefined,
    min_budget: minBudget,
    max_budget:
      maxBudget ||
      (filters.budget === "under-100k"
        ? 100000
        : filters.budget === "100k-300k"
          ? 300000
          : undefined),
    guests,
    venue_types: venueTypes,
    indoor_outdoor:
      filters.indoorOutdoor === "indoor" ||
      filters.indoorOutdoor === "outdoor" ||
      filters.indoorOutdoor === "both"
        ? filters.indoorOutdoor
        : undefined,
    parking: filters.amenities.includes("Parking") || undefined,
    pet_friendly: filters.amenities.includes("Pet Friendly") || undefined,
    wheelchair_accessible:
      filters.amenities.includes("Wheelchair Accessible") || undefined,
    sort_by:
      filters.sort === "price"
        ? "price_asc"
        : filters.sort === "rating"
          ? "rating"
          : filters.sort === "capacity"
            ? "capacity"
            : "relevance",
    per_page: 50,
  };
}

export default function VenuesClient({
  initialVenues,
  favoriteVenueIds = [],
}: {
  initialVenues: Venue[];
  favoriteVenueIds?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const smartSearch = useSmartVenueSearch();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiSearchResult, setAiSearchResult] =
    useState<SmartVenueSearchResponse | null>(null);
  const [localAiSummary, setLocalAiSummary] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState(
    () =>
      new Set([
        ...favoriteVenueIds.map(String),
        ...initialVenues
          .filter((venue) => venue.isFavorited)
          .map((venue) => String(venue.id)),
      ]),
  );
  const [favoritePendingId, setFavoritePendingId] = useState<string | null>(
    null,
  );

  const filters = useMemo(() => {
    const params = new URLSearchParams(queryString);

    return {
      query: params.get("q") ?? "",
      province: params.get("province") ?? "",
      city: params.get("city") ?? "",
      municipality: params.get("municipality") ?? "",
      location: params.get("location") ?? "",
      eventType: params.get("event") ?? "",
      budget: params.get("budget") ?? "",
      minBudget: params.get("minBudget") ?? "",
      maxBudget: params.get("maxBudget") ?? "",
      capacity: params.get("capacity") ?? "",
      venueTypes: (params.get("venueTypes") || params.get("style") || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      indoorOutdoor: params.get("indoorOutdoor") ?? "",
      amenities: (params.get("amenities") ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      sort: params.get("sort") ?? "recommended",
    };
  }, [queryString]);

  const activeFilterCount =
    [
      filters.query,
      filters.province,
      filters.city,
      filters.municipality,
      filters.location,
      filters.eventType,
      filters.budget || filters.minBudget || filters.maxBudget,
      filters.capacity,
      filters.indoorOutdoor,
    ].filter(Boolean).length +
    filters.venueTypes.length +
    filters.amenities.length;

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(queryString);

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
  };

  const clearFilters = () => {
    const params = new URLSearchParams(queryString);
    filterKeys.forEach((key) => params.delete(key));

    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
    setAiSearchResult(null);
    setLocalAiSummary([]);
    setAiPrompt("");
    smartSearch.reset();
  };

  const aiResultRank = useMemo(() => {
    if (!aiSearchResult) return new Map<string, number>();

    return new Map(
      aiSearchResult.venues.map((venue, index) => [String(venue.id), index]),
    );
  }, [aiSearchResult]);

  const filtered = useMemo(() => {
    const query = normalize(filters.query);
    const location = normalize(filters.location);
    const city = normalize(filters.city);
    const municipality = normalize(filters.municipality);
    const province = normalize(filters.province);
    const requestedCapacity = Number(filters.capacity) || 0;
    const source =
      aiResultRank.size > 0
        ? initialVenues.filter((venue) => aiResultRank.has(String(venue.id)))
        : initialVenues;

    const list = source.filter((venue) => {
      if (query) {
        const matchesQuery = getVenueSearchText(venue).includes(query);

        if (!matchesQuery) return false;
      }

      if (province && normalize(venue.province) !== province) return false;
      if (city && normalize(venue.city) !== city) return false;
      if (municipality && normalize(venue.municipality) !== municipality) {
        return false;
      }

      if (location) {
        const matchesLocation =
          textIncludes(venue.location, location) ||
          textIncludes(venue.city, location) ||
          textIncludes(venue.municipality, location) ||
          textIncludes(venue.province, location);

        if (!matchesLocation) return false;
      }

      if (!matchesEventType(venue, filters.eventType)) return false;
      if (!matchesBudgetPreset(venue, filters.budget)) return false;
      if (!matchesBudgetRange(venue, filters.minBudget, filters.maxBudget)) {
        return false;
      }

      if (
        requestedCapacity > 0 &&
        getVenueCapacity(venue) < requestedCapacity
      ) {
        return false;
      }

      if (!matchesVenueTypes(venue, filters.venueTypes)) return false;
      if (!matchesIndoorOutdoor(venue, filters.indoorOutdoor)) return false;

      if (
        filters.amenities.length > 0 &&
        !filters.amenities.every((amenity) => matchesAmenity(venue, amenity))
      ) {
        return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      if (aiResultRank.size > 0 && filters.sort === "recommended") {
        const rankDiff =
          (aiResultRank.get(String(a.id)) ?? Number.MAX_SAFE_INTEGER) -
          (aiResultRank.get(String(b.id)) ?? Number.MAX_SAFE_INTEGER);

        if (rankDiff !== 0) return rankDiff;
      }

      const aFavorited = favoriteIds.has(String(a.id));
      const bFavorited = favoriteIds.has(String(b.id));

      if (aFavorited !== bFavorited) {
        return aFavorited ? -1 : 1;
      }

      if (filters.sort === "price") {
        const aPrice = getVenuePrice(a) || Number.MAX_SAFE_INTEGER;
        const bPrice = getVenuePrice(b) || Number.MAX_SAFE_INTEGER;
        return aPrice - bPrice;
      }

      if (filters.sort === "rating") {
        return (b.rating || 0) - (a.rating || 0);
      }

      if (filters.sort === "capacity") {
        return getVenueCapacity(b) - getVenueCapacity(a);
      }

      const ratingDiff = (b.rating || 0) - (a.rating || 0);
      if (Math.abs(ratingDiff) > 0.001) return ratingDiff;

      return a.name.localeCompare(b.name);
    });
  }, [aiResultRank, favoriteIds, filters, initialVenues]);

  const applyLocalSmartSearch = (query: string) => {
    const intent = parseLocalSmartSearch(query, initialVenues);

    if (intent.summary.length === 0) return false;

    const params = new URLSearchParams(queryString);

    if (intent.keyword) params.set("q", intent.keyword);
    if (intent.province) params.set("province", intent.province);
    if (intent.city) params.set("city", intent.city);
    if (intent.municipality) params.set("municipality", intent.municipality);
    if (intent.eventType) params.set("event", intent.eventType);

    if (intent.minBudget) {
      params.set("minBudget", String(intent.minBudget));
      params.delete("budget");
    }

    if (intent.maxBudget) {
      params.set("maxBudget", String(intent.maxBudget));
      params.delete("budget");
    }

    if (intent.capacity) params.set("capacity", String(intent.capacity));

    if (intent.venueTypes.length > 0) {
      params.set("venueTypes", intent.venueTypes.join(","));
      params.delete("style");
    }

    if (intent.indoorOutdoor) {
      params.set("indoorOutdoor", intent.indoorOutdoor);
    }

    if (intent.amenities.length > 0) {
      const mergedAmenities = [
        ...new Set([...filters.amenities, ...intent.amenities]),
      ];
      params.set("amenities", mergedAmenities.join(","));
    }

    const nextQuery = params.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    });
    setLocalAiSummary(intent.summary);
    setAiSearchResult(null);
    smartSearch.reset();

    return true;
  };

  const handleSmartSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("aiPrompt") ?? aiPrompt)
      .trim()
      .slice(0, 500);

    if (!query && activeFilterCount === 0) return;

    try {
      const result = await smartSearch.mutateAsync({
        query: query || undefined,
        filters: toSmartSearchFilters(filters),
      });

      setAiSearchResult(result);
      setLocalAiSummary([]);
    } catch {
      if (query && applyLocalSmartSearch(query)) return;

      setAiSearchResult(null);
    }
  };

  const clearAiSearch = () => {
    setAiSearchResult(null);
    setLocalAiSummary([]);
    setAiPrompt("");
    smartSearch.reset();
  };

  const handleFavoriteToggle = async (
    event: React.MouseEvent<HTMLButtonElement>,
    venueId: string | number,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    const id = String(venueId);
    const previousFavoriteIds = new Set(favoriteIds);
    const optimisticFavoriteIds = new Set(favoriteIds);

    if (optimisticFavoriteIds.has(id)) {
      optimisticFavoriteIds.delete(id);
    } else {
      optimisticFavoriteIds.add(id);
    }

    setFavoriteIds(optimisticFavoriteIds);
    setFavoritePendingId(id);

    const result = await toggleFavoriteAction({ venueId: id });

    setFavoritePendingId(null);

    if (result.error) {
      setFavoriteIds(previousFavoriteIds);
      return;
    }

    setFavoriteIds((currentFavoriteIds) => {
      const nextFavoriteIds = new Set(currentFavoriteIds);

      if (result.data?.isFavorited) {
        nextFavoriteIds.add(id);
      } else {
        nextFavoriteIds.delete(id);
      }

      return nextFavoriteIds;
    });
  };

  const budgetSummary = getBudgetSummary(filters);
  const aiIntentSummary = aiSearchResult
    ? getIntentSummary(aiSearchResult.parsedFilters)
    : localAiSummary;
  const filterSummary = [
    filters.query && `Search: ${filters.query}`,
    filters.location ||
      filters.municipality ||
      filters.city ||
      filters.province,
    filters.eventType,
    budgetSummary,
    filters.capacity && `${filters.capacity}+ guests`,
    ...filters.venueTypes,
    filters.indoorOutdoor &&
      filters.indoorOutdoor.charAt(0).toUpperCase() +
        filters.indoorOutdoor.slice(1),
    ...filters.amenities,
  ].filter(Boolean);

  return (
    <div className="h-full min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 xl:px-12">
      {mobileFiltersOpen && (
        <div
          className="fixed inset-0 z-[60] lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Venue filters"
        >
          <button
            type="button"
            aria-label="Close filters"
            onClick={() => setMobileFiltersOpen(false)}
            className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
          />

          <div className="absolute inset-x-0 bottom-0 flex h-[92dvh] flex-col px-3 pb-3">
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-600 shadow-lg"
                aria-label="Close filters"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="h-full min-h-0 flex-1 overflow-hidden rounded-[28px] border border-[#E5E7EB] bg-white shadow-lg shadow-slate-900/10">
              <Sidebar
                venues={initialVenues}
                presentation="mobile"
                onApply={() => setMobileFiltersOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-9">
        <section className="max-w-full overflow-hidden rounded-[28px] border border-[#E5E7EB]/90 bg-white shadow-sm shadow-slate-200/60">
          <div className="grid gap-6 p-5 sm:p-7">
            <div className="min-w-0">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-1.5 text-[#2563EB]">
                <Sparkles className="h-3.5 w-3.5" />

                <span className="text-[11px] font-extrabold uppercase tracking-[0.14em]">
                  AI-powered venue discovery
                </span>
              </div>

              <h1 className="max-w-3xl break-words text-3xl font-black leading-9 tracking-[-0.04em] text-slate-950 sm:text-4xl sm:leading-tight">
                Wedding & Event Venues
              </h1>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-[#6B7280] sm:text-base">
                {filtered.length} venue{filtered.length === 1 ? "" : "s"} found
                matching your criteria. Compare spaces, pricing, and capacity in
                one polished marketplace.
              </p>
            </div>

            <form
              onSubmit={handleSmartSearch}
              className="grid gap-3 rounded-[24px] border border-[#DBEAFE] bg-[#F8FAFC] p-3 sm:p-4"
            >
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="relative min-w-0">
                  <label htmlFor="venue-ai-search" className="sr-only">
                    Natural language venue search
                  </label>

                  <Sparkles className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#2563EB]" />

                  <input
                    id="venue-ai-search"
                    name="aiPrompt"
                    type="search"
                    value={aiPrompt}
                    onInput={(event) => setAiPrompt(event.currentTarget.value)}
                    onChange={(event) => setAiPrompt(event.target.value)}
                    placeholder="Try: outdoor garden in Tagaytay for 150 guests under ₱250k with parking"
                    className="h-12 w-full rounded-2xl border border-[#BFDBFE] bg-white pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-[#93C5FD] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    smartSearch.isPending ||
                    (!aiPrompt.trim() && activeFilterCount === 0)
                  }
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {smartSearch.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Search AI
                </button>
              </div>

              {smartSearch.error && localAiSummary.length === 0 && (
                <p
                  className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
                  role="alert"
                >
                  {smartSearch.error.message}
                </p>
              )}

              {localAiSummary.length > 0 && !aiSearchResult && (
                <p
                  className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800"
                  role="status"
                >
                  AI search is temporarily unavailable, so local smart filters
                  were applied.
                </p>
              )}

              {(aiSearchResult || localAiSummary.length > 0) && (
                <div className="flex flex-wrap items-center gap-2 border-t border-[#DBEAFE] pt-3">
                  {aiIntentSummary.slice(0, 10).map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-[#DBEAFE] bg-white px-3 py-1.5 text-xs font-bold text-[#1D4ED8]"
                    >
                      {item}
                    </span>
                  ))}

                  <button
                    type="button"
                    onClick={clearAiSearch}
                    className="rounded-full px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500 transition hover:bg-white hover:text-[#1D4ED8]"
                  >
                    Clear AI
                  </button>
                </div>
              )}
            </form>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <div className="relative min-w-0">
                <label htmlFor="venue-search" className="sr-only">
                  Keyword venue search
                </label>

                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                <input
                  id="venue-search"
                  type="search"
                  value={filters.query}
                  onChange={(event) => updateFilter("q", event.target.value)}
                  placeholder="Search venue name, location, category, or amenity..."
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-[#F9FAFB] pl-11 pr-4 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 hover:border-[#93C5FD] focus:border-[#2563EB] focus:bg-white focus:ring-4 focus:ring-[#2563EB]/10"
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-[auto_minmax(180px,auto)]">
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(true)}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 transition hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/20 lg:hidden"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="rounded-full bg-[#2563EB] px-2 py-0.5 text-xs text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                <div className="relative min-w-0">
                  <SlidersHorizontal className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

                  <select
                    value={filters.sort}
                    onChange={(event) =>
                      updateFilter("sort", event.target.value)
                    }
                    className="h-12 w-full appearance-none rounded-2xl border border-slate-200 bg-white pl-11 pr-9 text-sm font-bold text-slate-600 outline-none transition hover:border-[#BFDBFE] focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
                    aria-label="Sort venues"
                  >
                    <option value="recommended">Recommended</option>
                    <option value="price">Price (low to high)</option>
                    <option value="rating">Highest rated</option>
                    <option value="capacity">Largest capacity</option>
                  </select>
                </div>
              </div>
            </div>

            {filterSummary.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                {filterSummary.map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-1.5 text-xs font-bold text-[#1D4ED8]"
                  >
                    {item}
                  </span>
                ))}

                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-full px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500 transition hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </section>

        {filtered.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[#E5E7EB] bg-white px-6 py-12 text-center shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
              <Search className="h-5 w-5" />
            </div>

            <h2 className="text-lg font-extrabold text-slate-950">
              No venues match those filters
            </h2>

            <p className="mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">
              Try a wider location, a broader budget, or fewer amenities to
              bring more spaces back into view.
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 rounded-full bg-[#2563EB] px-5 py-2.5 text-sm font-extrabold text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1d4ed8]"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((venue) => {
              const isFavorited = favoriteIds.has(String(venue.id));
              const isPending = favoritePendingId === String(venue.id);
              const hasRating = typeof venue.rating === "number";
              const ratingLabel = hasRating ? venue.rating!.toFixed(1) : "New";
              const capacityLabel = getVenueCapacityLabel(venue);

              return (
                <article
                  key={venue.id}
                  className="group relative flex h-full overflow-hidden rounded-[28px] border border-[#E5E7EB] bg-white shadow-[0_10px_28px_rgba(15,23,42,0.05)] transition-all duration-300 hover:-translate-y-1 hover:border-[#BFDBFE] hover:shadow-[0_18px_45px_rgba(15,23,42,0.1)]"
                >
                  <Link
                    href={`/venues/${venue.slug ?? venue.id}`}
                    className="flex h-full w-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                      <img
                        src={venue.image}
                        alt={venue.name}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-slate-950/5 to-transparent" />

                      <span className="absolute left-4 top-4 max-w-[calc(100%-5rem)] truncate rounded-full border border-white/70 bg-white/85 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#1D4ED8] shadow-sm backdrop-blur-md">
                        {venue.category ?? "Venue"}
                      </span>

                      <div className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/85 px-2.5 py-1.5 text-slate-700 shadow-sm backdrop-blur-md">
                        <Star
                          className={[
                            "h-3.5 w-3.5",
                            hasRating
                              ? "fill-[#F59E0B] text-[#F59E0B]"
                              : "text-slate-400",
                          ].join(" ")}
                        />

                        <span className="text-xs font-extrabold">
                          {ratingLabel}
                        </span>
                      </div>
                    </div>

                    <div className="flex min-h-[220px] flex-1 flex-col justify-between gap-5 p-5 sm:p-6">
                      <div className="min-w-0">
                        <h2 className="line-clamp-2 min-h-[3rem] text-lg font-extrabold leading-6 tracking-[-0.02em] text-slate-950 transition group-hover:text-[#1D4ED8]">
                          {venue.name}
                        </h2>

                        <p className="mt-3 flex min-w-0 items-start gap-2 text-sm font-medium leading-6 text-[#6B7280]">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#2563EB]" />

                          <span className="line-clamp-2">{venue.location}</span>
                        </p>
                      </div>

                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 border-t border-slate-100 pt-4">
                        <div className="min-w-0">
                          <p className="text-lg font-black leading-6 text-slate-950">
                            {venue.price}
                          </p>

                          <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                            starting price
                          </p>
                        </div>

                        <div className="inline-flex max-w-[150px] items-center gap-1.5 rounded-2xl bg-[#EFF6FF] px-3 py-2 text-[#1D4ED8]">
                          <Users className="h-3.5 w-3.5 shrink-0" />

                          <span className="truncate text-xs font-extrabold">
                            {capacityLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={(event) => handleFavoriteToggle(event, venue.id)}
                    disabled={isPending}
                    className={[
                      "absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/90 shadow-sm backdrop-blur-md transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 disabled:cursor-wait disabled:opacity-70",
                      isFavorited
                        ? "text-red-500 hover:bg-red-50"
                        : "text-slate-500 hover:bg-[#EFF6FF] hover:text-red-500",
                    ].join(" ")}
                    aria-label={
                      isFavorited
                        ? `Remove ${venue.name} from favorites`
                        : `Add ${venue.name} to favorites`
                    }
                    aria-pressed={isFavorited}
                  >
                    <Heart
                      className={`h-4 w-4 transition ${
                        isFavorited ? "fill-red-500 text-red-500" : ""
                      }`}
                    />
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
