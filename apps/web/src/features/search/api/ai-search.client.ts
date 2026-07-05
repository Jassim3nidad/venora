import { createClient } from "@/lib/supabase/client";
import {
  smartVenueSearchRequestSchema,
  smartVenueSearchResponseSchema,
  type SmartVenueSearchRequest,
  type SmartVenueSearchResponse,
} from "../schemas/search.schema";
import type { SmartSearchApiEnvelope } from "../types/search.types";

export class SmartSearchClientError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "SmartSearchClientError";
    this.code = code;
    this.details = details;
  }
}

export async function searchVenuesWithAi(
  input: SmartVenueSearchRequest,
): Promise<SmartVenueSearchResponse> {
  const parsedInput = smartVenueSearchRequestSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new SmartSearchClientError(
      "VALIDATION_ERROR",
      "Please enter a shorter search request.",
      parsedInput.error.flatten(),
    );
  }

  const hasQuery = Boolean(parsedInput.data.query?.trim());
  const hasFilters =
    parsedInput.data.filters &&
    Object.values(parsedInput.data.filters).some((value) =>
      Array.isArray(value) ? value.length > 0 : Boolean(value),
    );

  if (!hasQuery && !hasFilters) {
    throw new SmartSearchClientError(
      "VALIDATION_ERROR",
      "Describe the venue you are looking for or choose at least one filter.",
    );
  }

  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke<
    SmartSearchApiEnvelope | SmartVenueSearchResponse
  >("ai-search", {
    body: parsedInput.data,
  });

  if (error) {
    const edgeMessage = error.message || "";

    throw new SmartSearchClientError(
      "EDGE_FUNCTION_ERROR",
      edgeMessage.includes("Failed to send a request")
        ? "AI search service is not deployed or reachable yet."
        : edgeMessage || "AI search is temporarily unavailable.",
    );
  }

  if (!data) {
    throw new SmartSearchClientError(
      "EMPTY_AI_SEARCH_RESPONSE",
      "AI search returned no response.",
    );
  }

  const envelope = data as SmartSearchApiEnvelope | SmartVenueSearchResponse;

  if ("error" in envelope && envelope.error) {
    throw new SmartSearchClientError(
      envelope.error.code,
      envelope.error.message,
      envelope.error.details,
    );
  }

  const payload = "data" in envelope ? envelope.data : envelope;
  const parsedOutput = smartVenueSearchResponseSchema.safeParse(payload);

  if (!parsedOutput.success) {
    throw new SmartSearchClientError(
      "INVALID_AI_SEARCH_RESPONSE",
      "AI search returned an unexpected response.",
      parsedOutput.error.flatten(),
    );
  }

  return parsedOutput.data;
}
