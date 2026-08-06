"use client";

import { CheckCircle2, MoreVertical, RotateCcw, Send, Settings } from "lucide-react";
import Link from "next/link";
import { DashButton, StatusBadge } from "@/components/dashboard/enterprise";
import { cn } from "@venora/lib";

export type ActionState = {
  status: "idle" | "saving" | "saved" | "error";
  message: string;
};

type Props = {
  venue: {
    id: string;
    name: string;
    city: string | null;
    province: string | null;
  };
  profileStatus: string;
  actionState: ActionState;
  canPublish: boolean;
  publishIssues: string[];
  hasDraft: boolean;
  onPublish: () => void;
  onDiscard: () => void;
};

export function VenueProfileHeader({
  venue,
  profileStatus,
  actionState,
  canPublish,
  publishIssues,
  hasDraft,
  onPublish,
  onDiscard,
}: Props) {
  const location = [venue.city, venue.province].filter(Boolean).join(", ");
  
  return (
    <div 
      className={cn(
        "sticky top-0 z-40 mb-6 flex gap-4 border-b border-[#dbe3ef] bg-white/95 px-5 py-4 backdrop-blur-md",
        hasDraft 
          ? "flex-col sm:flex-row sm:items-center sm:justify-between sm:px-8" 
          : "flex-col items-start"
      )}
    >
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-bold text-[#0f172a]" title={venue.name}>{venue.name}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#64748b]">
          {location ? <span>{location}</span> : null}
          {location ? <span className="text-[#cbd5e1]">&bull;</span> : null}
          <span className="font-semibold text-[#0f172a]">{profileStatus}</span>
          <span className="text-[#cbd5e1]">&bull;</span>
          <span
            className={cn(
              "font-medium",
              actionState.status === "error" ? "text-red-700" : 
              actionState.status === "saving" ? "text-amber-600" :
              "text-[#475569]"
            )}
          >
            {actionState.message}
          </span>
        </div>
      </div>

      <div className={cn("flex flex-wrap items-center gap-2", hasDraft ? "shrink-0" : "w-full")}>
        <DashButton
          href={`/dashboard/venues/${venue.id}/edit`}
          variant="secondary"
          icon="settings"
        >
          Basic information
        </DashButton>
        <DashButton
          href={`/dashboard/venues/${venue.id}/experience/preview`}
          variant="secondary"
          icon="visibility"
        >
          Preview
        </DashButton>
        <button
          type="button"
          onClick={onPublish}
          disabled={!hasDraft || !canPublish || publishIssues.length > 0}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#1d4ed8] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#1e40af] disabled:opacity-50"
        >
          Publish updates
        </button>

        <div className="relative group">
          <button 
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#dbe3ef] text-[#475569] hover:bg-[#f8fafc]"
            aria-label="More actions"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          
          <div className="absolute right-0 top-full mt-1 hidden w-56 rounded-xl border border-[#dbe3ef] bg-white p-1 shadow-lg group-focus-within:block group-hover:block">
            {hasDraft && canPublish ? (
              <button
                type="button"
                onClick={onDiscard}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                <RotateCcw className="h-4 w-4" />
                Discard unpublished changes
              </button>
            ) : (
              <div className="px-3 py-2 text-sm text-[#94a3b8]">No additional actions</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
