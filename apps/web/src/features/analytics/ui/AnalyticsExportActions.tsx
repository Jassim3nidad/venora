"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MaterialIcon } from "@/components/dashboard/enterprise";
import type { DateRange } from "../application/queries";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Button,
} from "@venora/ui";
import { Download } from "lucide-react";

export function AnalyticsExportActions({
  range,
  endpoint = "/api/analytics/venue-owner/export",
}: {
  range: DateRange;
  endpoint?: string;
}) {
  const [activeFormat, setActiveFormat] = useState<"csv" | "pdf" | null>(null);

  async function downloadExport(format: "csv" | "pdf") {
    if (activeFormat) return;
    setActiveFormat(format);

    try {
      const params = new URLSearchParams({
        format,
        from: range.from,
        to: range.to,
      });

      const response = await fetch(`${endpoint}?${params.toString()}`, {
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
      const disposition = response.headers.get("Content-Disposition");
      const match = /filename="([^"]+)"/.exec(disposition ?? "");
      const filename = match?.[1] ?? `venora-venue-analytics.${format}`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success(`${format.toUpperCase()} export downloaded.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setActiveFormat(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 h-10 border-slate-200 shadow-sm"
          disabled={activeFormat !== null}
        >
          {activeFormat !== null ? (
            <MaterialIcon
              name="progress_activity"
              className="animate-spin text-lg"
            />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export analytics</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => void downloadExport("pdf")}
          disabled={activeFormat !== null}
        >
          Export summary as PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => void downloadExport("csv")}
          disabled={activeFormat !== null}
        >
          Export performance as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
