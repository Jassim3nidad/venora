import { z } from "zod";

// Blank HTML number/date inputs submit "" through react-hook-form, which
// z.coerce.number() turns into 0 (not undefined) and z.string().date()
// rejects outright — both wrong for genuinely-optional fields. Treat ""
// the same as "not provided" before the real validation runs.
const blankToUndefined = (val: unknown) =>
  val === "" || val === null ? undefined : val;
const optionalNonNegative = (max?: number) => {
  const schema =
    max !== undefined
      ? z.coerce.number().min(0).max(max)
      : z.coerce.number().min(0);
  return z.preprocess(blankToUndefined, schema.optional());
};
const optionalDateString = () =>
  z.preprocess(blankToUndefined, z.string().date().optional());

const baseFields = {
  label: z.string().trim().max(120).optional(),
  percentage: optionalNonNegative(100),
  flatFee: optionalNonNegative(),
  minCommissionAmount: optionalNonNegative(),
  maxCommissionAmount: optionalNonNegative(),
  effectiveFrom: z.string().date(),
  effectiveTo: optionalDateString(),
};

export const createCommissionRuleSchema = z
  .object({
    scope: z.enum(["global", "category", "venue"]),
    referenceId: z.string().uuid().optional(),
    ...baseFields,
  })
  .refine((v) => v.percentage !== undefined || v.flatFee !== undefined, {
    message: "Enter a percentage or a flat fee (or both).",
    path: ["percentage"],
  })
  .refine((v) => v.scope === "global" || v.referenceId, {
    message: "Category and venue rules require a reference.",
    path: ["referenceId"],
  });

export type CreateCommissionRuleInput = z.infer<
  typeof createCommissionRuleSchema
>;

export const updateCommissionRuleSchema = z
  .object({
    id: z.string().uuid(),
    isActive: z.boolean(),
    reason: z
      .string()
      .trim()
      .min(1, "A reason is required to modify a commission rule."),
    ...baseFields,
  })
  .refine((v) => v.percentage !== undefined || v.flatFee !== undefined, {
    message: "Enter a percentage or a flat fee (or both).",
    path: ["percentage"],
  });

export type UpdateCommissionRuleInput = z.infer<
  typeof updateCommissionRuleSchema
>;
