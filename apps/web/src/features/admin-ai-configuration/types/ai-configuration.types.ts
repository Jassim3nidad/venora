export const AI_FEATURES = [
  "assistant",
  "search",
  "recommendation",
  "venue_description",
  "cost_estimator",
  "package_comparison",
  "booking_auto_accept",
  "embeddings",
] as const;

export type AiFeature = (typeof AI_FEATURES)[number];

export const AI_FEATURE_LABELS: Record<AiFeature, string> = {
  assistant: "AI Assistant",
  search: "Smart Search",
  recommendation: "Recommendations",
  venue_description: "Venue Description Generator",
  cost_estimator: "Cost Estimator",
  package_comparison: "Package Comparison",
  booking_auto_accept: "Booking Auto-Accept",
  embeddings: "Search Embeddings",
};

export type AiConfiguration = {
  feature: AiFeature;
  enabled: boolean;
  provider: string;
  model: string;
  fallbackProvider: string | null;
  fallbackModel: string | null;
  systemInstruction: string | null;
  maxTokens: number;
  timeoutSeconds: number;
  temperature: number | null;
  moderationEnabled: boolean;
  rateLimitPerMinute: number | null;
  dailyUsageLimit: number | null;
  spendingLimitCents: number | null;
  updatedByName: string | null;
  updatedAt: string;
};

export type AiUsageSummary = {
  feature: AiFeature;
  requestCount: number;
  failureCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCostCents: number;
};
