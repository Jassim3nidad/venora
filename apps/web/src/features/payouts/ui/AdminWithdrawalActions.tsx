"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  approveWithdrawalAction,
  dispatchWithdrawalAction,
  rejectWithdrawalAction,
  resolveWithdrawalReviewAction,
} from "../application/admin-withdrawal-actions";
import type { WithdrawalStatus } from "../types/payout.types";

export function AdminWithdrawalActions({
  withdrawalId,
  status,
}: {
  withdrawalId: string;
  status: WithdrawalStatus;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(fn: () => Promise<{ error: { message: string } | null }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.error) setError(result.error.message);

      // Refresh on failure too. A failed dispatch is not a no-op: the
      // provider was refused, so the withdrawal has already moved to
      // `failed` and its payouts have been released back to the
      // recipient's available balance. Leaving the row rendered as
      // "Approved" tells the admin the opposite of what happened.
      router.refresh();
    });
  }

  // A withdrawal under review needs a human to state what the provider
  // actually did. Both outcomes demand evidence, so neither is offered as
  // a one-click action.
  if (status === "needs_review") {
    function resolve(outcome: "paid" | "failed") {
      const prompt =
        outcome === "paid"
          ? [
              "Confirm the provider settled this transfer.",
              "",
              "Enter the evidence (PayMongo transfer id, dashboard reference, or support ticket). This is recorded against your account.",
            ].join("\n")
          : [
              "Confirm the provider did NOT send this transfer.",
              "",
              "Enter the evidence that no money moved. The funds will be returned to the recipient's available balance.",
            ].join("\n");

      const note = window.prompt(prompt, "");
      if (note === null) return;

      run(() =>
        resolveWithdrawalReviewAction({
          withdrawalId,
          outcome,
          note: note.trim(),
        }),
      );
    }

    return (
      <div className="flex flex-col items-end gap-1.5">
        <p className="max-w-xs text-right text-xs font-semibold text-orange-700">
          Outcome unknown — funds are held, not lost. Confirm with PayMongo
          before resolving.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={() => resolve("paid")}
            className="text-xs font-bold uppercase tracking-wider text-emerald-700 transition hover:underline disabled:opacity-50"
          >
            Provider settled it
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => resolve("failed")}
            className="text-xs font-bold uppercase tracking-wider text-red-600 transition hover:underline disabled:opacity-50"
          >
            Provider did not send it
          </button>
          {isPending ? (
            <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
          ) : null}
        </div>
        {error ? (
          <p className="max-w-xs text-right text-xs font-semibold text-red-600">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  if (status !== "pending" && status !== "approved") return null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-3">
        {status === "pending" ? (
          <>
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                run(() => approveWithdrawalAction({ withdrawalId }))
              }
              className="text-xs font-bold uppercase tracking-wider text-emerald-700 transition hover:underline disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                const note = window.prompt("Reason for declining this payout?");
                if (!note?.trim()) return;
                run(() => rejectWithdrawalAction({ withdrawalId, note }));
              }}
              className="text-xs font-bold uppercase tracking-wider text-red-600 transition hover:underline disabled:opacity-50"
            >
              Decline
            </button>
          </>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              run(() => dispatchWithdrawalAction({ withdrawalId }))
            }
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#2563EB] transition hover:underline disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Send payout
          </button>
        )}
      </div>

      {error ? (
        <p className="max-w-xs text-xs font-semibold text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
