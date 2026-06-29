import { z } from "zod";

export const searchSchema = z.object({
  q:           z.string().optional(),
  city:        z.string().optional(),
  capacity:    z.coerce.number().int().positive().optional(),
  max_price:   z.coerce.number().positive().optional(),
  amenities:   z.array(z.string()).optional(),
  event_type:  z.string().optional(),
  page:        z.coerce.number().int().min(1).default(1),
  per_page:    z.coerce.number().int().min(1).max(50).default(12),
  sort_by:     z.enum(["relevance", "price_asc", "price_desc", "rating"]).default("relevance"),
  ai:          z.coerce.boolean().default(false),
});

export type SearchInput = z.infer<typeof searchSchema>;
