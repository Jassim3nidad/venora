import { describe, expect, it } from "vitest";
import { updateAiConfigurationSchema } from "./ai-configuration.schema";

const validConfiguration = {
  feature: "assistant",
  enabled: true,
  provider: "openrouter",
  model: "tencent/hy3:free",
  fallbackProvider: "",
  fallbackModel: "",
  systemInstruction: "Ground answers in Venora data.",
  maxTokens: 4_000,
  timeoutSeconds: 30,
  temperature: 0.4,
  moderationEnabled: true,
  rateLimitPerMinute: 10,
  dailyUsageLimit: 1_000,
  spendingLimitCents: 0,
  reason: "Approved provider policy",
} as const;

describe("updateAiConfigurationSchema", () => {
  it("accepts the approved OpenRouter HY3 configuration", () => {
    expect(
      updateAiConfigurationSchema.safeParse(validConfiguration).success,
    ).toBe(true);
  });

  it("rejects an alternate provider or model", () => {
    expect(
      updateAiConfigurationSchema.safeParse({
        ...validConfiguration,
        provider: "openai",
      }).success,
    ).toBe(false);
    expect(
      updateAiConfigurationSchema.safeParse({
        ...validConfiguration,
        model: "another/model",
      }).success,
    ).toBe(false);
  });

  it("rejects fallback provider configuration", () => {
    expect(
      updateAiConfigurationSchema.safeParse({
        ...validConfiguration,
        fallbackProvider: "another-provider",
        fallbackModel: "another/model",
      }).success,
    ).toBe(false);
  });
});
