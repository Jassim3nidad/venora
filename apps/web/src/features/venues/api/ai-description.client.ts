import { createClient } from "@/lib/supabase/client";
import {
  generateVenueDescriptionRequestSchema,
  generateVenueDescriptionResponseSchema,
  type GenerateVenueDescriptionRequest,
  type GenerateVenueDescriptionResponse,
} from "../schemas/ai-description.schema";

type EdgeFunctionEnvelope<T> =
  | { data: T; error: null }
  | { data: null; error: { code: string; message: string; details?: unknown } };

export class AIDescriptionClientError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AIDescriptionClientError";
    this.code = code;
    this.details = details;
  }
}

export async function generateVenueDescription(
  input: GenerateVenueDescriptionRequest,
): Promise<GenerateVenueDescriptionResponse> {
  const parsedInput = generateVenueDescriptionRequestSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new AIDescriptionClientError(
      "VALIDATION_ERROR",
      "Please choose a content type and tone.",
      parsedInput.error.flatten(),
    );
  }

  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke<
    EdgeFunctionEnvelope<GenerateVenueDescriptionResponse>
  >("ai-venue-description", { body: parsedInput.data });

  if (error) {
    const edgeMessage = error.message || "";
    throw new AIDescriptionClientError(
      "EDGE_FUNCTION_ERROR",
      edgeMessage.includes("Failed to send a request")
        ? "Description generator is not deployed or reachable yet."
        : edgeMessage || "Description generator is temporarily unavailable.",
    );
  }

  if (!data) {
    throw new AIDescriptionClientError(
      "EMPTY_RESPONSE",
      "Description generator returned no response.",
    );
  }

  if (data.error) {
    throw new AIDescriptionClientError(
      data.error.code,
      data.error.message,
      data.error.details,
    );
  }

  const parsedOutput = generateVenueDescriptionResponseSchema.safeParse(
    data.data,
  );

  if (!parsedOutput.success) {
    throw new AIDescriptionClientError(
      "INVALID_RESPONSE",
      "Description generator returned an unexpected response.",
      parsedOutput.error.flatten(),
    );
  }

  return parsedOutput.data;
}
