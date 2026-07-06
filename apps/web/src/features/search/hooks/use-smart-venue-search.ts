"use client";

import { useMutation } from "@tanstack/react-query";
import { searchVenuesWithAi } from "../api/ai-search.client";
import type {
  SmartVenueSearchRequest,
  SmartVenueSearchResponse,
} from "../schemas/search.schema";

export function useSmartVenueSearch() {
  return useMutation<SmartVenueSearchResponse, Error, SmartVenueSearchRequest>({
    mutationFn: searchVenuesWithAi,
  });
}
