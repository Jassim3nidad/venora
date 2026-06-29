import { z } from "zod";

export const paymentIntentSchema = z.object({
  booking_id: z.string().uuid(),
  amount:     z.number().positive(),
  gateway:    z.enum(["paymongo", "maya"]),
  currency:   z.literal("PHP").default("PHP"),
});
export type PaymentIntentInput = z.infer<typeof paymentIntentSchema>;

export const refundSchema = z.object({
  booking_id:          z.string().uuid(),
  payment_reference:   z.string().min(1),
  reason:              z.string().max(255).optional(),
});
export type RefundInput = z.infer<typeof refundSchema>;
