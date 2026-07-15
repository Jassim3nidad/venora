import { createClient } from "@/lib/supabase/client";
import {
  comparePackagesRequestSchema,
  comparePackagesResponseSchema,
  type ComparePackagesRequest,
  type ComparePackagesResponse,
} from "../schemas/comparison.schema";

type EdgeFunctionEnvelope<T> =
  | { data: T; error: null }
  | { data: null; error: { code: string; message: string; details?: unknown } };

export class AIPackageComparisonClientError extends Error {
  readonly code: string;
  readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AIPackageComparisonClientError";
    this.code = code;
    this.details = details;
  }
}

export async function comparePackages(
  input: ComparePackagesRequest,
): Promise<ComparePackagesResponse> {
  const parsedInput = comparePackagesRequestSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new AIPackageComparisonClientError(
      "VALIDATION_ERROR",
      "Choose 2 to 4 packages to compare.",
      parsedInput.error.flatten(),
    );
  }

  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke<
    EdgeFunctionEnvelope<ComparePackagesResponse>
  >("ai-package-comparison", { body: parsedInput.data });

  if (error) {
    const edgeMessage = error.message || "";
    throw new AIPackageComparisonClientError(
      "EDGE_FUNCTION_ERROR",
      edgeMessage.includes("Failed to send a request")
        ? "Package comparison is not deployed or reachable yet."
        : edgeMessage || "Package comparison is temporarily unavailable.",
    );
  }

  if (!data) {
    throw new AIPackageComparisonClientError(
      "EMPTY_RESPONSE",
      "Package comparison returned no response.",
    );
  }

  if (data.error) {
    throw new AIPackageComparisonClientError(
      data.error.code,
      data.error.message,
      data.error.details,
    );
  }

  const parsedOutput = comparePackagesResponseSchema.safeParse(data.data);

  if (!parsedOutput.success) {
    throw new AIPackageComparisonClientError(
      "INVALID_RESPONSE",
      "Package comparison returned an unexpected response.",
      parsedOutput.error.flatten(),
    );
  }

  return parsedOutput.data;
}
