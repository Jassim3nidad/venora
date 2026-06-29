/**
 * Server Action wrapper utility.
 *
 * Wraps a Server Action handler with:
 * 1. Zod input parsing
 * 2. Typed ApiResponse envelope ({ data, error })
 * 3. VenoraError → ApiError mapping
 * 4. Unexpected error catching + logging
 *
 * Usage:
 *   export async function myAction(rawInput: unknown) {
 *     return createServerAction(mySchema, async (input) => {
 *       return await myUseCase.execute(input);
 *     }, rawInput);
 *   }
 *
 * @see docs/conventions/api-conventions.md#3-server-actions
 */

import type { z } from "zod";
import { VenoraError } from "./errors";

export type ApiError = {
  code:     string;
  message:  string;
  details?: unknown;
};

export type ApiResponse<T> =
  | { data: T;    error: null  }
  | { data: null; error: ApiError };

export async function createServerAction<
  TSchema extends z.ZodTypeAny,
  TResult,
>(
  schema:    TSchema,
  handler:   (input: z.infer<TSchema>) => Promise<TResult>,
  rawInput:  unknown
): Promise<ApiResponse<TResult>> {
  // ── 1. Validate input ────────────────────────────────────
  const parsed = schema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      data:  null,
      error: {
        code:    "VALIDATION_ERROR",
        message: "Invalid input. Please check the highlighted fields.",
        details: parsed.error.flatten(),
      },
    };
  }

  // ── 2. Execute handler ───────────────────────────────────
  try {
    const data = await handler(parsed.data as z.infer<TSchema>);
    return { data, error: null };
  } catch (e) {
    // Known domain / application errors
    if (e instanceof VenoraError) {
      return {
        data:  null,
        error: {
          code:    e.code,
          message: e.message,
        },
      };
    }

    // Unexpected errors (Supabase network failure, etc.)
    console.error("[ServerAction] Unexpected error:", e);
    return {
      data:  null,
      error: {
        code:    "INTERNAL_ERROR",
        message: "Something went wrong. Please try again.",
      },
    };
  }
}

/**
 * Type guard: check if a response is successful.
 *
 * Usage:
 *   const result = await myAction(input);
 *   if (isSuccess(result)) {
 *     console.log(result.data);  // typed correctly
 *   }
 */
export function isSuccess<T>(
  response: ApiResponse<T>
): response is { data: T; error: null } {
  return response.error === null;
}

/**
 * Type guard: check if a response is an error.
 */
export function isError<T>(
  response: ApiResponse<T>
): response is { data: null; error: ApiError } {
  return response.error !== null;
}
