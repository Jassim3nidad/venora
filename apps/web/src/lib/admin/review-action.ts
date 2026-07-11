/**
 * Shared plumbing for the venue/supplier admin review workflows. The two
 * domains have different validation rules and status enums (see
 * admin_review_venue()/admin_review_supplier() in
 * supabase/migrations/055_review_workflows.sql), so the SQL functions and
 * TS action files stay separate — but the request/response shape and error
 * mapping are identical, so that part is factored out here rather than
 * copy-pasted.
 */

import { z } from "zod";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";

export function createReviewActionSchema<const T extends readonly [string, ...string[]]>(actions: T) {
  return z.object({
    id: z.string().uuid(),
    action: z.enum(actions as unknown as [T[number], ...T[number][]]),
    reason: z.string().trim().max(1000).optional(),
  });
}

/**
 * Maps a Postgres error raised by admin_review_venue()/admin_review_supplier()/
 * admin_set_account_status() into the right VenoraError subclass. These
 * functions RAISE EXCEPTION with a plain human-readable message for every
 * failure mode (missing permission, invalid transition, missing required
 * field, missing reason) — there's no SQLSTATE to branch on, so this
 * pattern-matches the message text.
 */
export function throwIfReviewActionError(error: { message?: string } | null | undefined): void {
  if (!error) return;

  const message = error.message ?? "This action could not be completed.";
  const normalized = message.toLowerCase();

  if (normalized.includes("do not have permission")) {
    throw new ForbiddenError(message);
  }
  if (normalized.includes("not found")) {
    // NotFoundError's constructor appends " not found" to its argument, but
    // our Postgres messages ("Venue not found", "Account not found") already
    // include it — strip the suffix so it isn't duplicated.
    throw new NotFoundError(message.replace(/\s*not found\.?$/i, ""));
  }
  throw new ValidationError(message);
}
