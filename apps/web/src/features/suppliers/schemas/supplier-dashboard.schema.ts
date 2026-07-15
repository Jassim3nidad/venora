import { z } from "zod";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date");

const optionalText = (max: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(max).optional(),
  );

export const supplierQuoteItemSchema = z.object({
  description: z
    .string()
    .trim()
    .min(2, "Item description is required")
    .max(240),
  quantity: z.coerce
    .number()
    .positive("Quantity must be greater than zero")
    .max(10000),
  unitPrice: z.coerce
    .number()
    .min(0, "Unit price cannot be negative")
    .max(100000000),
});

export const supplierQuoteSchema = z.object({
  id: z.string().uuid().optional(),
  inquiryId: z.string().uuid("Inquiry is required"),
  title: z.string().trim().min(2, "Quote title is required").max(160),
  serviceDescription: optionalText(2000),
  items: z
    .array(supplierQuoteItemSchema)
    .min(1, "Add at least one quote item")
    .max(40),
  additionalFees: z.coerce.number().min(0).max(100000000).default(0),
  validUntil: isoDateSchema.optional(),
  terms: optionalText(3000),
});

export const supplierQuoteIdSchema = z.object({
  quoteId: z.string().uuid("Quote is required"),
});

export const supplierMessageSchema = z.object({
  inquiryId: z.string().uuid("Inquiry is required"),
  message: z.string().trim().min(1, "Message is required").max(2000),
});

export const supplierAvailabilitySchema = z.object({
  date: isoDateSchema,
  status: z.enum(["available", "unavailable", "blocked"]),
  reason: optionalText(300),
});

export const clearSupplierAvailabilitySchema = z.object({
  date: isoDateSchema,
});

export const supplierInquiryQuerySchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  status: z.enum(["all", "new", "responded", "closed"]).default("all"),
  sort: z.enum(["newest", "event_date", "status"]).default("newest"),
});

export type SupplierQuoteInput = z.infer<typeof supplierQuoteSchema>;
export type SupplierMessageInput = z.infer<typeof supplierMessageSchema>;
export type SupplierAvailabilityInput = z.infer<
  typeof supplierAvailabilitySchema
>;
