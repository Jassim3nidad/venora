import { z } from "zod";

export const partnerApplicationSchema = z.object({
  roleAppliedFor: z.enum(["venue_owner", "event_coordinator", "supplier"]),
  category: z.string().min(1, "Please select a category"),
  address: z.object({
    country: z.string().min(1, "Country is required"),
    unit: z.string().optional(),
    building: z.string().optional(),
    street: z.string().min(1, "Street address is required"),
    district: z.string().min(1, "District/Barangay is required"),
    city: z.string().min(1, "City/Municipality is required"),
    zip: z.string().min(1, "ZIP code is required"),
  }),
  documents: z.array(z.string()).min(1, "Please upload the required verification documents"),
});

export type PartnerApplicationInput = z.infer<typeof partnerApplicationSchema>;
