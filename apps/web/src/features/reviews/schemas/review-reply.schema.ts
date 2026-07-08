import { z } from "zod";

export const replyToReviewSchema = z.object({
  reviewId: z.string().uuid(),
  reply: z.string().trim().min(1, "Write a reply before submitting").max(1000),
});
export type ReplyToReviewInput = z.infer<typeof replyToReviewSchema>;
