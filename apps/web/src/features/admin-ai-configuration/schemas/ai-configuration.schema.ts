import { z } from "zod";
import { AI_FEATURES } from "../types/ai-configuration.types";

const blankToUndefined = (val: unknown) =>
  val === "" || val === null ? undefined : val;

export const updateAiConfigurationSchema = z.object({
  feature: z.enum(AI_FEATURES),
  enabled: z.boolean(),
  provider: z
    .string()
    .trim()
    .superRefine((value, context) => {
      if (value !== "openrouter") {
        context.addIssue({
          code: "custom",
          message: "OpenRouter is the only supported AI provider",
        });
      }
    }),
  model: z
    .string()
    .trim()
    .superRefine((value, context) => {
      if (value !== "qwen/qwen3.7-flash") {
        context.addIssue({
          code: "custom",
          message: "qwen/qwen3.7-flash is the required AI model",
        });
      }
    }),
  fallbackProvider: z.preprocess(
    blankToUndefined,
    z
      .string()
      .trim()
      .optional()
      .superRefine((value, context) => {
        if (value !== undefined) {
          context.addIssue({
            code: "custom",
            message: "Fallback AI providers are not supported",
          });
        }
      }),
  ),
  fallbackModel: z.preprocess(
    blankToUndefined,
    z
      .string()
      .trim()
      .optional()
      .superRefine((value, context) => {
        if (value !== undefined) {
          context.addIssue({
            code: "custom",
            message: "Fallback AI models are not supported",
          });
        }
      }),
  ),
  systemInstruction: z.preprocess(
    blankToUndefined,
    z.string().trim().max(4000).optional(),
  ),
  maxTokens: z.coerce.number().int().min(1).max(32000),
  timeoutSeconds: z.coerce.number().int().min(1).max(300),
  temperature: z.preprocess(
    blankToUndefined,
    z.coerce.number().min(0).max(2).optional(),
  ),
  moderationEnabled: z.boolean(),
  rateLimitPerMinute: z.preprocess(
    blankToUndefined,
    z.coerce.number().int().min(1).optional(),
  ),
  dailyUsageLimit: z.preprocess(
    blankToUndefined,
    z.coerce.number().int().min(1).optional(),
  ),
  spendingLimitCents: z.preprocess(
    blankToUndefined,
    z.coerce.number().int().min(0).optional(),
  ),
  reason: z.string().trim().max(500).optional(),
});

export type UpdateAiConfigurationInput = z.infer<
  typeof updateAiConfigurationSchema
>;
