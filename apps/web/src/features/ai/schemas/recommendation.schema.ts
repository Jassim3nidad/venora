import { z } from "zod";
import { smartVenueSearchVenueSchema } from "@/features/search/schemas/search.schema";

export const aiRecommendationResponseSchema = z.object({
  venues: z.array(smartVenueSearchVenueSchema),
  recommendationEventIds: z.record(z.string(), z.string()),
  mode: z.enum(["personalized", "cold_start"]),
  preferenceQuery: z.string().nullable(),
});

export type AIRecommendationResponse = z.infer<typeof aiRecommendationResponseSchema>;
