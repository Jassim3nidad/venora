"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MaterialIcon } from "@/components/dashboard/enterprise";
import type { DateRange } from "../application/queries";

function exportHref(format: "csv" | "pdf", range: DateRange) {
  const params = new URLSearchParams({
    format,
    from: range.from,
    to: range.to,
  });

  return `/api/analytics/venue-owner/export?${params.toString()}`;
}

function filenameFromDisposition(disposition: string | null, fallback: string) {
  const match = /filename="([^"]+)"/.exec(disposition ?? "");
  return match?.[1] ?? fallback;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function AnalyticsExportActions({ range }: { range: DateRange }) {
  const [activeFormat, setActiveFormat] = useState<"csv" | "pdf" | null>(null);

  async function downloadExport(format: "csv" | "pdf") {
    if (activeFormat) return;

    setActiveFormat(format);

    try {
      const response = await fetch(exportHref(format, range), {
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        const fallback = `Unable to export ${format.toUpperCase()} report.`;
        const payload = (await response.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(payload?.error?.message ?? fallback);
      }

      const blob = await response.blob();
      const filename = filenameFromDisposition(
        response.headers.get("Content-Disposition"),
        `venora-venue-analytics.${format}`,
      );

      triggerDownload(blob, filename);
      toast.success(`${format.toUpperCase()} export downloaded.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setActiveFormat(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {[
        { format: "csv" as const, icon: "table_view", label: "CSV" },
        { format: "pdf" as const, icon: "picture_as_pdf", label: "PDF" },
      ].map((item) => {
        const isActive = activeFormat === item.format;
        const isDisabled = activeFormat !== null;

        return (
          <button
            key={item.format}
            type="button"
            disabled={isDisabled}
            onClick={() => void downloadExport(item.format)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[#dbe3ef] bg-white px-4 py-2.5 text-sm font-bold text-[#0f172a] shadow-sm shadow-slate-200/60 transition hover:border-[#93c5fd] hover:text-[#1d4ed8] focus:outline-none focus:ring-4 focus:ring-[#dbeafe] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <MaterialIcon
              name={isActive ? "progress_activity" : item.icon}
              className={`text-lg ${isActive ? "animate-spin" : ""}`}
            />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
