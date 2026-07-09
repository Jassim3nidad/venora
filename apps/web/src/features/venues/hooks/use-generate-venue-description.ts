"use client";

import { useMutation } from "@tanstack/react-query";
import { generateVenueDescription } from "../api/ai-description.client";
import type {
  GenerateVenueDescriptionRequest,
  GenerateVenueDescriptionResponse,
} from "../schemas/ai-description.schema";

export function useGenerateVenueDescription() {
  return useMutation<GenerateVenueDescriptionResponse, Error, GenerateVenueDescriptionRequest>({
    mutationFn: generateVenueDescription,
  });
}
