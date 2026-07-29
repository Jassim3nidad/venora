"use client";

import { Check, Minus, Sparkles } from "lucide-react";
import type { ComparePackagesResponse } from "../schemas/comparison.schema";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

interface PackageComparisonTableProps {
  result: ComparePackagesResponse;
}

export default function PackageComparisonTable({
  result,
}: PackageComparisonTableProps) {
  const { comparisonTable, aiSummary } = result;
  const allInclusions = [
    ...new Set(comparisonTable.flatMap((row) => row.inclusions)),
  ];

  return (
    <div className="space-y-5">
      <div className="overflow-x-auto rounded-2xl border border-[var(--border-default)]">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="bg-[var(--bg-subtle)]">
              <th className="p-3.5 text-left text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Package
              </th>
              {comparisonTable.map((row) => (
                <th
                  key={row.id}
                  className="p-3.5 text-left text-xs font-bold text-[var(--text-primary)]"
                >
                  <div>{row.name}</div>
                  <div className="text-[11px] font-medium text-[var(--text-muted)]">
                    {row.venueName}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-[var(--border-default)]">
              <td className="p-3.5 text-xs font-semibold text-[var(--text-muted)]">
                Price
              </td>
              {comparisonTable.map((row) => (
                <td
                  key={row.id}
                  className="p-3.5 text-sm font-bold text-[var(--text-primary)]"
                >
                  {formatCurrency(row.price)}
                  <span className="ml-1 text-[11px] font-normal text-[var(--text-muted)]">
                    /{row.priceUnit.replace("per_", "")}
                  </span>
                </td>
              ))}
            </tr>
            <tr className="border-t border-[var(--border-default)]">
              <td className="p-3.5 text-xs font-semibold text-[var(--text-muted)]">
                Guests
              </td>
              {comparisonTable.map((row) => (
                <td
                  key={row.id}
                  className="p-3.5 text-sm text-[var(--text-primary)]"
                >
                  {row.minGuests ?? "—"}–{row.maxGuests ?? "—"}
                </td>
              ))}
            </tr>
            {allInclusions.map((inclusion) => (
              <tr
                key={inclusion}
                className="border-t border-[var(--border-default)]"
              >
                <td className="p-3.5 text-xs text-[var(--text-secondary)]">
                  {inclusion}
                </td>
                {comparisonTable.map((row) => (
                  <td key={row.id} className="p-3.5">
                    {row.inclusions.includes(inclusion) ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Minus className="h-4 w-4 text-[var(--text-muted)]" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {aiSummary ? (
        <div className="space-y-4 rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] p-4">
          <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[#2563EB]">
            <Sparkles className="h-3.5 w-3.5" />
            AI Summary
          </div>

          {aiSummary.highlights.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Highlights
              </p>
              <ul className="space-y-1">
                {aiSummary.highlights.map((item, index) => (
                  <li key={index} className="flex gap-2 text-xs text-[#4B5563]">
                    <span className="text-[#2563EB]">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {aiSummary.tradeoffs.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Tradeoffs
              </p>
              <ul className="space-y-1">
                {aiSummary.tradeoffs.map((item, index) => (
                  <li key={index} className="flex gap-2 text-xs text-[#4B5563]">
                    <span className="text-[#2563EB]">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {aiSummary.bestFor.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                Best for
              </p>
              {aiSummary.bestFor.map((entry) => {
                const pkg = comparisonTable.find(
                  (row) => row.id === entry.packageId,
                );
                return (
                  <p key={entry.packageId} className="text-xs text-[#4B5563]">
                    <span className="font-semibold text-[var(--text-primary)]">
                      {pkg?.name ?? "Package"}:
                    </span>{" "}
                    {entry.note}
                  </p>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4 text-sm font-medium text-[#64748B]">
          Comparison uses package price, guest capacity, and inclusions. AI
          narrative is unavailable right now (config, limits, or provider) —
          the table above is still accurate.
        </div>
      )}
    </div>
  );
}
