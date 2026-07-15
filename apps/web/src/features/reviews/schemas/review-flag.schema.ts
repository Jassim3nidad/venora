import { z } from "zod";

export const REVIEW_FLAG_REASONS = [
  "spam",
  "offensive",
  "fake",
  "other",
] as const;

export const flagReviewSchema = z.object({
  reviewId: z.string().uuid(),
  reason: z.enum(REVIEW_FLAG_REASONS),
  details: z.string().trim().max(500).optional(),
});
export type FlagReviewInput = z.infer<typeof flagReviewSchema>;
