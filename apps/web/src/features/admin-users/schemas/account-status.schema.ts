import { z } from "zod";

export const setAccountStatusSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["suspend", "reactivate"]),
  reason: z.string().trim().max(1000).optional(),
});

export type SetAccountStatusInput = z.infer<typeof setAccountStatusSchema>;
