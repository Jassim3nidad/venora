import { z } from "zod";

export const toggleHelpfulVoteSchema = z.object({
  reviewId: z.string().uuid(),
});
export type ToggleHelpfulVoteInput = z.infer<typeof toggleHelpfulVoteSchema>;
