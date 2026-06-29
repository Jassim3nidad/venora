import { z } from "zod";

export const calendarBlockSchema = z.object({
  venue_id:    z.string().uuid(),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time:  z.string().regex(/^\d{2}:\d{2}$/),
  end_time:    z.string().regex(/^\d{2}:\d{2}$/),
  reason:      z.string().max(255).optional(),
});
export type CalendarBlockInput = z.infer<typeof calendarBlockSchema>;
