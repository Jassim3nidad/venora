import { z } from "zod";

export const moderateReviewSchema = z.object({
  reviewId: z.string().uuid(),
});
export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>;
