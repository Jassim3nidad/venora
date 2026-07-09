"use client";

import { RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@venora/ui";
import type { AICostEstimatorResponse } from "../schemas/ai.schema";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

interface CostEstimatorResultProps {
  result: AICostEstimatorResponse;
  onReset: () => void;
}

export default function CostEstimatorResult({
  result,
  onReset,
}: CostEstimatorResultProps) {
  const { estimate } = result;
  const lineItems = [
    { label: "Base venue", value: estimate.baseVenue },
    { label: "Packages", value: estimate.packages },
    { label: "Catering", value: estimate.catering },
    { label: "Sound & AV", value: estimate.av },
  ].filter((item) => item.value > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#2563EB]">
        <Sparkles className="h-3.5 w-3.5" />
        AI Estimate for {result.venue.name}
      </div>

      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4">
        <dl className="space-y-2.5">
          {lineItems.map((item) => (
            <div key={item.label} className="flex items-center justify-between text-sm">
              <dt className="text-[var(--text-secondary)] font-medium">{item.label}</dt>
              <dd className="text-[var(--text-primary)] font-semibold">
                {formatCurrency(item.value)}
              </dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 flex items-center justify-between border-t border-[var(--border-default)] pt-3">
          <span className="text-sm font-bold text-[var(--text-primary)]">
            Estimated Total
          </span>
          <span className="text-lg font-black text-[var(--color-brand-600)]">
            {formatCurrency(estimate.total)}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          Breakdown
        </h4>
        <ul className="space-y-1.5">
          {estimate.breakdown.map((line, index) => (
            <li
              key={index}
              className="text-xs leading-relaxed text-[var(--text-secondary)] flex gap-2"
            >
              <span className="text-[var(--color-brand-600)]">•</span>
              {line}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-[11px] text-[var(--text-muted)]">
        This is an AI-generated estimate for planning purposes only. Contact the venue
        for a final quote.
      </p>

      <Button
        type="button"
        variant="outline"
        onClick={onReset}
        className="h-10 w-full rounded-xl text-sm font-medium border-[var(--border-default)] flex items-center justify-center gap-2"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Estimate Again
      </Button>
    </div>
  );
}
