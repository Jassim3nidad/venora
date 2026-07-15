"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchVenueRecommendations } from "../api/ai-recommendation.client";
import { queryKeys } from "@/lib/query-keys";

export function useVenueRecommendations(userId: string | null) {
  return useQuery({
    queryKey: userId
      ? queryKeys.ai.recommendations(userId)
      : ["ai", "recommendations", "anonymous"],
    queryFn: fetchVenueRecommendations,
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
