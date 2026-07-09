import { createClient } from "@/lib/supabase/client";
import {
  aiCostEstimatorSchema,
  aiCostEstimatorResponseSchema,
  type AICostEstimatorInput,
  type AICostEstimatorResponse,
} from "../schemas/ai.schema";

type EdgeFunctionEnvelope<T> =
  | { data: T; error: null }
  | { data: null; error: { code: string; message: string; details?: unknown } };

export class AICostEstimatorClientError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AICostEstimatorClientError";
    this.code = code;
    this.details = details;
  }
}

export async function estimateVenueCost(
  input: AICostEstimatorInput,
): Promise<AICostEstimatorResponse> {
  const parsedInput = aiCostEstimatorSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new AICostEstimatorClientError(
      "VALIDATION_ERROR",
      "Please check the event details you entered.",
      parsedInput.error.flatten(),
    );
  }

  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke<
    EdgeFunctionEnvelope<AICostEstimatorResponse>
  >("ai-cost-estimator", {
    body: parsedInput.data,
  });

  if (error) {
    const edgeMessage = error.message || "";
    throw new AICostEstimatorClientError(
      "EDGE_FUNCTION_ERROR",
      edgeMessage.includes("Failed to send a request")
        ? "Cost estimator is not deployed or reachable yet."
        : edgeMessage || "Cost estimator is temporarily unavailable.",
    );
  }

  if (!data) {
    throw new AICostEstimatorClientError(
      "EMPTY_RESPONSE",
      "Cost estimator returned no response.",
    );
  }

  if (data.error) {
    throw new AICostEstimatorClientError(
      data.error.code,
      data.error.message,
      data.error.details,
    );
  }

  const parsedOutput = aiCostEstimatorResponseSchema.safeParse(data.data);

  if (!parsedOutput.success) {
    throw new AICostEstimatorClientError(
      "INVALID_RESPONSE",
      "Cost estimator returned an unexpected response.",
      parsedOutput.error.flatten(),
    );
  }

  return parsedOutput.data;
}
