"use client";

import { useMutation } from "@tanstack/react-query";
import { estimateVenueCost } from "../api/ai-cost-estimator.client";
import type {
  AICostEstimatorInput,
  AICostEstimatorResponse,
} from "../schemas/ai.schema";

export function useCostEstimator() {
  return useMutation<AICostEstimatorResponse, Error, AICostEstimatorInput>({
    mutationFn: estimateVenueCost,
  });
}
