import { createClient } from "@/lib/supabase/client";
import {
  aiRecommendationResponseSchema,
  type AIRecommendationResponse,
} from "../schemas/recommendation.schema";

type EdgeFunctionEnvelope<T> =
  | { data: T; error: null }
  | { data: null; error: { code: string; message: string; details?: unknown } };

export class AIRecommendationClientError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AIRecommendationClientError";
    this.code = code;
    this.details = details;
  }
}

export async function fetchVenueRecommendations(): Promise<AIRecommendationResponse> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke<
    EdgeFunctionEnvelope<AIRecommendationResponse>
  >("ai-recommendation", { body: {} });

  if (error) {
    const edgeMessage = error.message || "";
    throw new AIRecommendationClientError(
      "EDGE_FUNCTION_ERROR",
      edgeMessage.includes("Failed to send a request")
        ? "Recommendations service is not deployed or reachable yet."
        : edgeMessage || "Recommendations are temporarily unavailable.",
    );
  }

  if (!data) {
    throw new AIRecommendationClientError(
      "EMPTY_RESPONSE",
      "Recommendations returned no response.",
    );
  }

  if (data.error) {
    throw new AIRecommendationClientError(
      data.error.code,
      data.error.message,
      data.error.details,
    );
  }

  const parsed = aiRecommendationResponseSchema.safeParse(data.data);

  if (!parsed.success) {
    throw new AIRecommendationClientError(
      "INVALID_RESPONSE",
      "Recommendations returned an unexpected response.",
      parsed.error.flatten(),
    );
  }

  // Fetch images for the returned venues
  const venueIds = parsed.data.venues.map((v) => v.id);
  if (venueIds.length > 0) {
    const { data: images } = await supabase
      .from("venue_images")
      .select("venue_id, storage_path")
      .in("venue_id", venueIds)
      .eq("is_featured", true);

    const imageMap = new Map<string, string>();
    if (images) {
      for (const img of images as Array<{
        venue_id: string;
        storage_path: string;
      }>) {
        if (!imageMap.has(img.venue_id)) {
          imageMap.set(img.venue_id, img.storage_path);
        }
      }
    }

    parsed.data.venues = parsed.data.venues.map((v) => ({
      ...v,
      image: imageMap.get(v.id) || null,
    }));
  }

  return parsed.data;
}

export async function recordRecommendationClick(
  eventId: string,
): Promise<void> {
  // `record_recommendation_click` predates the last `pnpm db:types` regeneration
  // (see packages/database/types/generated.ts header) — cast like other
  // not-yet-typed RPCs in this codebase (e.g. booking actions.ts).
  const supabase = createClient() as any;
  // Fire-and-forget analytics — never block or surface errors to the user for this.
  await supabase.rpc("record_recommendation_click", { event_id: eventId }).then(
    () => undefined,
    (error: unknown) => {
      console.warn("[recommendation] Failed to record click:", error);
    },
  );
}
