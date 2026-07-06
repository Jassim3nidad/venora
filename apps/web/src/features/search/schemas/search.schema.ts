import { z } from "zod";

export const venueTypeOptions = [
  "garden",
  "beach",
  "resort",
  "hotel",
  "restaurant",
  "church",
] as const;

export const indoorOutdoorOptions = ["indoor", "outdoor", "both"] as const;

export const searchSortOptions = [
  "relevance",
  "price_asc",
  "price_desc",
  "rating",
  "capacity",
] as const;

export const smartSearchFiltersSchema = z.object({
  q: z.string().trim().max(240).optional(),
  keyword: z.string().trim().max(120).optional(),
  province: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  municipality: z.string().trim().max(80).optional(),
  min_budget: z.coerce.number().positive().optional(),
  max_budget: z.coerce.number().positive().optional(),
  guests: z.coerce.number().int().positive().optional(),
  venue_types: z.array(z.enum(venueTypeOptions)).default([]),
  indoor_outdoor: z.enum(indoorOutdoorOptions).optional(),
  parking: z.coerce.boolean().optional(),
  pet_friendly: z.coerce.boolean().optional(),
  wheelchair_accessible: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(50).default(24),
  sort_by: z.enum(searchSortOptions).default("relevance"),
});

export const searchSchema = z.object({
  ...smartSearchFiltersSchema.shape,
  amenities: z.array(z.string()).optional(),
  event_type: z.string().optional(),
  ai: z.coerce.boolean().default(false),
});

export type SearchInput = z.infer<typeof searchSchema>;
export type SmartSearchFilters = z.infer<typeof smartSearchFiltersSchema>;

export const smartVenueSearchRequestSchema = z.object({
  query: z.string().trim().max(500).optional(),
  filters: smartSearchFiltersSchema.partial().optional(),
});

export type SmartVenueSearchRequest = z.infer<
  typeof smartVenueSearchRequestSchema
>;

export const smartVenueSearchIntentSchema = z.object({
  province: z.string().nullable(),
  city: z.string().nullable(),
  municipality: z.string().nullable(),
  minBudget: z.number().nullable(),
  maxBudget: z.number().nullable(),
  guests: z.number().nullable(),
  venueTypes: z.array(z.enum(venueTypeOptions)),
  indoorOutdoor: z.enum(indoorOutdoorOptions).nullable(),
  parking: z.boolean(),
  petFriendly: z.boolean(),
  wheelchairAccessible: z.boolean(),
  keyword: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

export type SmartVenueSearchIntent = z.infer<
  typeof smartVenueSearchIntentSchema
>;

export const smartVenueSearchVenueSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string().nullable(),
  city: z.string().nullable(),
  province: z.string().nullable(),
  municipality: z.string().nullable(),
  basePrice: z.number().nullable(),
  capacityMin: z.number().nullable(),
  capacityMax: z.number().nullable(),
  indoorOutdoor: z.string().nullable(),
  parkingAvailable: z.boolean().nullable(),
  petFriendly: z.boolean().nullable(),
  wheelchairAccessible: z.boolean().nullable(),
  avgRating: z.number().nullable(),
  similarity: z.number().nullable(),
  relevanceScore: z.number().nullable(),
  categories: z.array(z.string()),
  amenities: z.array(z.string()),
  eventTypes: z.array(z.string()),
});

export const smartVenueSearchResponseSchema = z.object({
  venues: z.array(smartVenueSearchVenueSchema),
  parsedFilters: smartVenueSearchIntentSchema,
  fallbackReason: z.string().nullable().optional(),
  embeddedVenueCount: z.number().int().nonnegative().optional(),
});

export type SmartVenueSearchVenue = z.infer<typeof smartVenueSearchVenueSchema>;
export type SmartVenueSearchResponse = z.infer<
  typeof smartVenueSearchResponseSchema
>;
