import type {
  SmartSearchFilters,
  SmartVenueSearchIntent,
  SmartVenueSearchRequest,
  SmartVenueSearchResponse,
  SmartVenueSearchVenue,
} from "../schemas/search.schema";

export type {
  SmartSearchFilters,
  SmartVenueSearchIntent,
  SmartVenueSearchRequest,
  SmartVenueSearchResponse,
  SmartVenueSearchVenue,
};

export type SmartSearchApiEnvelope =
  | { data: SmartVenueSearchResponse; error: null }
  | {
      data: null;
      error: {
        code: string;
        message: string;
        details?: unknown;
      };
    };

export type SearchMode = "keyword" | "natural-language";
