"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/dashboard/enterprise";
import { updateAiConfigurationSchema, type UpdateAiConfigurationInput } from "../schemas/ai-configuration.schema";
import { updateAiConfigurationAction } from "../application/actions";
import { AI_FEATURE_LABELS, type AiConfiguration } from "../types/ai-configuration.types";

const inputClass =
  "w-full rounded-xl border border-[#dbe3ef] bg-white p-2.5 text-sm focus:border-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-[#dbeafe]";
const labelClass = "mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#64748b]";

export function AiConfigurationCard({ config }: { config: AiConfiguration }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<UpdateAiConfigurationInput>({
    resolver: zodResolver(updateAiConfigurationSchema),
    defaultValues: {
      feature: config.feature,
      enabled: config.enabled,
      provider: config.provider,
      model: config.model,
      fallbackProvider: config.fallbackProvider ?? "",
      fallbackModel: config.fallbackModel ?? "",
      systemInstruction: config.systemInstruction ?? "",
      maxTokens: config.maxTokens,
      timeoutSeconds: config.timeoutSeconds,
      temperature: config.temperature ?? undefined,
      moderationEnabled: config.moderationEnabled,
      rateLimitPerMinute: config.rateLimitPerMinute ?? undefined,
      dailyUsageLimit: config.dailyUsageLimit ?? undefined,
      spendingLimitCents: config.spendingLimitCents ?? undefined,
      reason: "",
    },
  });

  async function onSubmit(values: UpdateAiConfigurationInput) {
    if (config.enabled && !values.enabled) {
      if (!values.reason?.trim()) {
        toast.error("Add a reason before disabling an AI feature.");
        return;
      }

      const confirmed = window.confirm(
        `Disable ${AI_FEATURE_LABELS[config.feature]} for all users? New AI requests for this feature will stop until it is enabled again.`,
      );

      if (!confirmed) return;
    }

    const result = await updateAiConfigurationAction(values);
    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    toast.success(`${AI_FEATURE_LABELS[config.feature]} configuration saved`);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-[#e5e7eb] bg-white">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <p className="font-bold text-[#111827]">{AI_FEATURE_LABELS[config.feature]}</p>
          <p className="text-xs text-[#6b7280]">{config.provider} · {config.model}</p>
        </div>
        <StatusBadge status={config.enabled ? "active" : "inactive"} label={config.enabled ? "Enabled" : "Disabled"} />
      </button>

      {expanded ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 border-t border-[#f1f5f9] p-5">
          <div className="flex items-center gap-2">
            <input id={`${config.feature}-enabled`} type="checkbox" {...register("enabled")} className="h-4 w-4 rounded border-[#dbe3ef]" />
            <label htmlFor={`${config.feature}-enabled`} className="text-sm font-semibold text-[#111827]">Feature enabled</label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Provider</label>
              <input {...register("provider")} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Model</label>
              <input {...register("model")} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Fallback provider</label>
              <input {...register("fallbackProvider")} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Fallback model</label>
              <input {...register("fallbackModel")} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>System instruction template</label>
            <textarea {...register("systemInstruction")} rows={3} className={inputClass} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Max tokens</label>
              <input type="number" {...register("maxTokens")} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Timeout (seconds)</label>
              <input type="number" {...register("timeoutSeconds")} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Temperature</label>
              <input type="number" step="0.1" {...register("temperature")} className={inputClass} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Rate limit (req/min)</label>
              <input type="number" {...register("rateLimitPerMinute")} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Daily usage limit</label>
              <input type="number" {...register("dailyUsageLimit")} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Spending limit (₱ cents)</label>
              <input type="number" {...register("spendingLimitCents")} className={inputClass} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input id={`${config.feature}-moderation`} type="checkbox" {...register("moderationEnabled")} className="h-4 w-4 rounded border-[#dbe3ef]" />
            <label htmlFor={`${config.feature}-moderation`} className="text-sm font-semibold text-[#111827]">Moderation enabled</label>
          </div>

          <div>
            <label className={labelClass}>Reason for this change <span className="font-normal normal-case text-[#6b7280]">(recorded in audit log)</span></label>
            <input {...register("reason")} className={inputClass} />
          </div>

          <div className="flex justify-end border-t border-[#f1f5f9] pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-[#1d4ed8] px-5 py-2 text-sm font-bold text-white hover:bg-[#1e40af] disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save configuration
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
