import { z } from "zod";

/**
 * Withdrawal and payout-account input contracts.
 *
 * Amount bounds here are a first filter only — request_withdrawal()
 * re-checks the minimum and the available balance under row locks, and
 * that check is the authoritative one.
 */

export const payoutMethodSchema = z.enum(["bank", "gcash", "paymaya"]);

/** PH mobile numbers are 11 digits; local bank accounts run 10-16. */
const accountIdentifierSchema = z
  .string()
  .trim()
  .min(1, "Account number is required")
  .max(34)
  .refine((value) => value.replace(/[^0-9]/g, "").length >= 10, {
    message: "Enter the full account or mobile number",
  });

export const payoutAccountSchema = z
  .object({
    scope: z.enum(["organization", "supplier"]),
    scopeId: z.string().uuid(),
    method: payoutMethodSchema,
    accountName: z
      .string()
      .trim()
      .min(2, "Account holder name is required")
      .max(160),
    bankName: z
      .preprocess(
        (value) =>
          typeof value === "string" && value.trim() === "" ? undefined : value,
        z.string().trim().max(160).optional(),
      ),
    accountIdentifier: accountIdentifierSchema,
    makeDefault: z.coerce.boolean().default(false),
  })
  .refine((input) => input.method !== "bank" || Boolean(input.bankName), {
    message: "Bank name is required for a bank transfer",
    path: ["bankName"],
  });

export const withdrawalRequestSchema = z.object({
  payoutAccountId: z.string().uuid("Choose a payout account"),
  amount: z.coerce
    .number()
    .positive("Enter an amount greater than zero")
    .max(10_000_000, "That amount is above the per-request limit")
    // Money is numeric(12,2); reject sub-centavo input rather than
    // silently rounding it into a mismatch with the claimed payouts.
    .refine((value) => Number.isInteger(Math.round(value * 100)), {
      message: "Amount cannot have more than two decimal places",
    }),
  /**
   * Client-generated per submission. A retried or double-clicked submit
   * carries the same key and returns the original request instead of
   * claiming a second set of payouts.
   */
  idempotencyKey: z.string().uuid("A valid submission key is required"),
});

export const withdrawalIdSchema = z.object({
  withdrawalId: z.string().uuid(),
});

export const archivePayoutAccountSchema = z.object({
  payoutAccountId: z.string().uuid(),
});

export type PayoutAccountInput = z.infer<typeof payoutAccountSchema>;
export type WithdrawalRequestInput = z.infer<typeof withdrawalRequestSchema>;
