import { createClient } from "@/lib/supabase/client";
import {
  generateThemePreviewRequestSchema,
  generateThemePreviewResponseSchema,
  type GenerateThemePreviewRequest,
  type GenerateThemePreviewResponse,
} from "../schemas/theme-preview.schema";

type EdgeFunctionEnvelope<T> =
  | { data: T; error: null }
  | { data: null; error: { code: string; message: string; details?: unknown } };

export class ThemePreviewClientError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ThemePreviewClientError";
    this.code = code;
    this.details = details;
  }
}

export async function generateThemePreview(
  input: GenerateThemePreviewRequest,
): Promise<GenerateThemePreviewResponse> {
  const parsedInput = generateThemePreviewRequestSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new ThemePreviewClientError(
      "VALIDATION_ERROR",
      "Please choose a theme, or describe one in 3-200 characters.",
      parsedInput.error.flatten(),
    );
  }

  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke<
    EdgeFunctionEnvelope<GenerateThemePreviewResponse>
  >("generate-theme-preview", { body: parsedInput.data });

  if (error) {
    const edgeMessage = error.message || "";
    throw new ThemePreviewClientError(
      "EDGE_FUNCTION_ERROR",
      edgeMessage.includes("Failed to send a request")
        ? "Theme preview is not deployed or reachable yet."
        : edgeMessage || "Theme preview is temporarily unavailable.",
    );
  }

  if (!data) {
    throw new ThemePreviewClientError(
      "EMPTY_RESPONSE",
      "Theme preview returned no response.",
    );
  }

  if (data.error) {
    throw new ThemePreviewClientError(
      data.error.code,
      data.error.message,
      data.error.details,
    );
  }

  const parsedOutput = generateThemePreviewResponseSchema.safeParse(data.data);

  if (!parsedOutput.success) {
    throw new ThemePreviewClientError(
      "INVALID_RESPONSE",
      "Theme preview returned an unexpected response.",
      parsedOutput.error.flatten(),
    );
  }

  return parsedOutput.data;
}
