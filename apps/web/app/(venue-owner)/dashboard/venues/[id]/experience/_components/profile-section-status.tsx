import { cn } from "@venora/lib";
import { type ProfileSectionStatus } from "@/src/features/venues/utils/structured-editor";

export function statusLabel(status: ProfileSectionStatus["completionState"]) {
  if (status === "needs_attention") return "Needs attention";
  if (status === "in_progress") return "In progress";
  if (status === "not_started") return "Not started";
  return status.replace("_", " ");
}

export function statusTone(status: ProfileSectionStatus["completionState"]) {
  if (status === "complete") return "text-emerald-700 bg-emerald-50 ring-emerald-200";
  if (status === "needs_attention" || status === "blocked") return "text-red-700 bg-red-50 ring-red-200";
  if (status === "in_progress") return "text-amber-700 bg-amber-50 ring-amber-200";
  return "text-slate-600 bg-slate-50 ring-slate-200";
}

export function SectionBadge({ status }: { status: ProfileSectionStatus["completionState"] }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ring-1",
        statusTone(status),
      )}
    >
      {statusLabel(status)}
    </span>
  );
}
