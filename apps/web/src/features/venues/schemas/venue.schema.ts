import { z } from "zod";

export const venueSchema = z.object({
  name:         z.string().min(3, "Venue name must be at least 3 characters"),
  description:  z.string().max(2000).optional(),
  address:      z.string().min(5, "Address is required"),
  city:         z.string().min(2, "City is required"),
  region:       z.string().min(2, "Region is required"),
  capacity_min: z.number().int().min(1),
  capacity_max: z.number().int().min(1),
  base_price:   z.number().positive(),
  amenities:    z.array(z.string()).optional(),
}).refine((d) => d.capacity_max >= d.capacity_min, {
  message: "Max capacity must be >= min capacity",
  path: ["capacity_max"],
});

export type VenueInput = z.infer<typeof venueSchema>;
