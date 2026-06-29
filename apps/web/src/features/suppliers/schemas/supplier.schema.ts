import { z } from "zod";

export const supplierSchema = z.object({
  business_name: z.string().min(2, "Business name required"),
  category:      z.enum(["catering", "photography", "av", "decoration", "entertainment", "other"]),
  description:   z.string().max(1000).optional(),
  phone:         z.string().optional(),
  website:       z.string().url().optional(),
  service_areas: z.array(z.string()).min(1, "Select at least one service area"),
});
export type SupplierInput = z.infer<typeof supplierSchema>;
