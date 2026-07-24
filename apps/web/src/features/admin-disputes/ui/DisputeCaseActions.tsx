"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateDisputeStatusAction } from "../application/actions";

export function DisputeCaseActions({
  disputeId,
  status,
  canManage,
  canResolve,
}: {
  disputeId: string;
  status: string;
  canManage: boolean;
  canResolve: boolean;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (nextStatus: "under_review" | "resolved" | "rejected" | "cancelled") => {
    setError(null);
    startTransition(async () => {
      const result = await updateDisputeStatusAction({
        disputeId,
        status: nextStatus,
        resolutionNotes: notes.trim() || undefined,
      });

      if (result.error) {
        setError(result.error.message);
        toast.error(result.error.message);
        return;
      }

      toast.success(
        nextStatus === "under_review"
          ? "Dispute moved to under review."
          : nextStatus === "resolved"
            ? "Dispute resolved."
            : nextStatus === "rejected"
              ? "Dispute rejected."
              : "Dispute cancelled.",
      );
      router.refresh();
    });
  };

  if (["resolved", "rejected", "cancelled"].includes(status)) {
    return null;
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {status === "open" && canManage ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => run("under_review")}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#1d4ed8] px-5 text-sm font-bold text-white disabled:opacity-50"
          >
            {pending ? "Updating..." : "Start review"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run("cancelled")}
            className="inline-flex h-11 items-center justify-center rounded-xl border border-[#dbe3ef] bg-white px-5 text-sm font-bold text-[#0f172a] disabled:opacity-50"
          >
            Cancel case
          </button>
        </div>
      ) : null}

      {status === "under_review" && canResolve ? (
        <div className="space-y-3">
          <label className="flex flex-col gap-2 text-sm font-bold text-[#0f172a]">
            Resolution notes
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              placeholder="Describe the decision and any follow-up for the customer or venue..."
              className="rounded-xl border border-[#dbe3ef] bg-white p-3 text-sm font-semibold text-[#0f172a] outline-none focus:border-[#2563eb] focus:ring-4 focus:ring-[#dbeafe]"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={() => run("resolved")}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white disabled:opacity-50"
            >
              {pending ? "Saving..." : "Resolve"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run("rejected")}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-red-600 px-5 text-sm font-bold text-white disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      ) : null}

      {status === "under_review" && !canResolve ? (
        <p className="rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-4 text-sm font-semibold text-[#64748b]">
          This case is under review. Resolving it requires the disputes.resolve
          permission.
        </p>
      ) : null}

      {status === "open" && !canManage ? (
        <p className="rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-4 text-sm font-semibold text-[#64748b]">
          Viewing only. Managing this case requires the disputes.manage
          permission.
        </p>
      ) : null}
    </div>
  );
}
