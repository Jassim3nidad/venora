import { z } from "zod";
import { PAYMENT_PROVIDERS } from "../types/payment.types";

export const paymentProviderSchema = z.enum(PAYMENT_PROVIDERS);
export type PaymentProviderInput = z.infer<typeof paymentProviderSchema>;

export const startPaymentSchema = z.object({
  provider: paymentProviderSchema.default("paymongo"),
});
export type StartPaymentInput = z.infer<typeof startPaymentSchema>;

export const paymentIntentSchema = z.object({
  booking_id: z.string().uuid(),
  amount: z.number().positive(),
  gateway: paymentProviderSchema,
  currency: z.literal("PHP").default("PHP"),
});
export type PaymentIntentInput = z.infer<typeof paymentIntentSchema>;

export const refundRequestSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(500, "Refund reason must be 500 characters or fewer")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});
export type RefundRequestInput = z.infer<typeof refundRequestSchema>;
