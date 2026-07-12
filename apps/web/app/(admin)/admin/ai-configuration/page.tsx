import type { Metadata } from "next";
import { DashboardSubPage, EmptyState, Panel, PanelHeader, DataTable, type DataTableColumn } from "@/components/dashboard/enterprise";
import { requirePermissionOrRedirect, hasPermission } from "@/lib/rbac/admin-context";
import { getAiConfigurations, getAiUsageSummary } from "@/features/admin-ai-configuration/application/queries";
import { AiConfigurationCard } from "@/features/admin-ai-configuration/ui/AiConfigurationCard";
import { AI_FEATURE_LABELS, type AiUsageSummary } from "@/features/admin-ai-configuration/types/ai-configuration.types";

export const metadata: Metadata = { title: "AI Configuration - Admin" };
export const dynamic = "force-dynamic";

export default async function AdminAiConfigurationPage() {
  await requirePermissionOrRedirect("ai_config.view");
  const canManage = await hasPermission("ai_config.manage");

  const [{ configurations, error }, usage] = await Promise.all([
    getAiConfigurations(),
    getAiUsageSummary(),
  ]);

  const usageColumns: DataTableColumn<AiUsageSummary>[] = [
    { key: "feature", header: "Feature", cell: (row) => AI_FEATURE_LABELS[row.feature] },
    { key: "requests", header: "Requests (30d)", cell: (row) => String(row.requestCount) },
    { key: "failures", header: "Failures", cell: (row) => String(row.failureCount) },
    { key: "tokens", header: "Tokens (in/out)", cell: (row) => `${row.totalInputTokens.toLocaleString()} / ${row.totalOutputTokens.toLocaleString()}` },
    { key: "cost", header: "Est. cost", cell: (row) => `₱${(row.estimatedCostCents / 100).toFixed(2)}` },
  ];

  return (
    <DashboardSubPage
      title="AI Configuration"
      description="Feature-level AI settings. API keys are never stored here — they live in Supabase Edge Function secrets."
    >
      <Panel>
        <PanelHeader title="How this works" />
        <ul className="space-y-2 text-sm text-[#475569]">
          <li>• <strong>Key status:</strong> not shown here — this app can't read Supabase Edge Function secrets. Verify keys in the Supabase Dashboard under Edge Functions → Secrets.</li>
          <li>• <strong>Live enforcement:</strong> all 6 AI Edge Functions read this configuration on every request — a disabled feature is rejected before it ever reaches the provider, and rate/daily/spending limits are checked against real usage logs.</li>
          <li>• <strong>Provider/model validation:</strong> only <code>openrouter</code> and <code>openai</code> are recognized providers; an unrecognized provider or blank model fails closed (500) rather than silently falling back to a default.</li>
          <li>• <strong>Fallback provider/model:</strong> stored and shown, but not yet actively switched to on a primary-provider failure — a failed request is logged and returned as an error rather than retried against the fallback. Treat the fallback fields as configuration-in-waiting for now.</li>
          <li>• <strong>Moderation:</strong> when enabled, free-text inputs (assistant chat, search queries) are checked against a lightweight prompt-injection/safety heuristic before being sent to the provider — this is not a full content-moderation API integration.</li>
          <li>• <strong>Usage metrics:</strong> the table below reads from the real usage log, populated by every AI request (metadata only — no prompt content is ever stored in it).</li>
        </ul>
      </Panel>

      {error ? (
        <EmptyState icon="error" title="Could not load AI configuration" description={error} />
      ) : configurations ? (
        <div className="space-y-3">
          {configurations.map((config) => (
            canManage ? (
              <AiConfigurationCard key={config.feature} config={config} />
            ) : (
              <Panel key={config.feature}>
                <PanelHeader title={AI_FEATURE_LABELS[config.feature]} description={`${config.provider} · ${config.model} · ${config.enabled ? "Enabled" : "Disabled"}`} />
              </Panel>
            )
          ))}
        </div>
      ) : null}

      <Panel>
        <PanelHeader title="Usage (last 30 days)" description="Request counts, token usage, and estimated cost — no prompt content is logged." />
        {usage.length > 0 ? (
          <DataTable rows={usage} columns={usageColumns} keyFn={(row) => row.feature} />
        ) : (
          <EmptyState
            icon="analytics"
            title="No usage data yet"
            description="No AI requests have been logged in the last 30 days. Every ai-* Edge Function now writes here after each request, so this fills in as the features are used."
          />
        )}
      </Panel>
    </DashboardSubPage>
  );
}
