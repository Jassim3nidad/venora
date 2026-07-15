"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Shared action bar for the venue and supplier admin review workflows.
 * The two domains have different actions/statuses/validation (see
 * admin_review_venue()/admin_review_supplier()), but the "pick an action,
 * optionally require a reason, submit, toast, refresh" mechanics are
 * identical — factored out here rather than duplicated per domain.
 */

export type ReviewActionDef = {
  key: string;
  label: string;
  variant?: "primary" | "secondary" | "danger";
  requiresReason?: boolean;
  reasonLabel?: string;
};

type ReviewActionResult = {
  data: unknown;
  error: { message: string } | null;
};

const VARIANT_STYLES: Record<
  NonNullable<ReviewActionDef["variant"]>,
  string
> = {
  primary: "bg-[#1d4ed8] text-white hover:bg-[#1e40af]",
  secondary:
    "border border-[#dbe3ef] bg-white text-[#111827] hover:border-[#1d4ed8] hover:text-[#1d4ed8]",
  danger: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
};

export function ReviewActionBar({
  entityId,
  actions,
  onSubmit,
}: {
  entityId: string;
  actions: ReviewActionDef[];
  onSubmit: (input: {
    id: string;
    action: string;
    reason?: string;
  }) => Promise<ReviewActionResult>;
}) {
  const router = useRouter();
  const [activeAction, setActiveAction] = useState<ReviewActionDef | null>(
    null,
  );
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleClick(action: ReviewActionDef) {
    if (action.requiresReason) {
      setActiveAction(action);
      setReason("");
    } else {
      run(action.key);
    }
  }

  function run(actionKey: string, reasonText?: string) {
    startTransition(async () => {
      const result = await onSubmit({
        id: entityId,
        action: actionKey,
        ...(reasonText ? { reason: reasonText } : {}),
      });
      if (result.error) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Saved");
      setActiveAction(null);
      setReason("");
      router.refresh();
    });
  }

  if (actions.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            disabled={isPending}
            onClick={() => handleClick(action)}
            className={`inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-sm font-bold transition disabled:opacity-50 ${VARIANT_STYLES[action.variant ?? "secondary"]}`}
          >
            {isPending && activeAction?.key === action.key ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : null}
            {action.label}
          </button>
        ))}
      </div>

      {activeAction ? (
        <div className="rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-4">
          <label
            htmlFor={`reason-${activeAction.key}`}
            className="mb-2 block text-sm font-bold text-[#111827]"
          >
            {activeAction.reasonLabel ?? "Reason"}
          </label>
          <textarea
            id={`reason-${activeAction.key}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={isPending}
            rows={3}
            maxLength={1000}
            className="w-full rounded-lg border border-[#dbe3ef] bg-white p-2.5 text-sm focus:border-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-[#dbeafe]"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setActiveAction(null)}
              disabled={isPending}
              className="rounded-lg px-3.5 py-2 text-sm font-bold text-[#4b5563] hover:bg-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => run(activeAction.key, reason)}
              disabled={isPending || !reason.trim()}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition disabled:opacity-50 ${VARIANT_STYLES[activeAction.variant ?? "secondary"]}`}
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              Confirm {activeAction.label.toLowerCase()}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
