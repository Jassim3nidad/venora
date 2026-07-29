"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateDisputeStatusAction } from "../application/actions";

export function CancelDisputeButton({ disputeId }: { disputeId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {error ? (
        <p className="text-xs font-semibold text-red-600">{error}</p>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await updateDisputeStatusAction({
              disputeId,
              status: "cancelled",
            });
            if (result.error) {
              setError(result.error.message);
              toast.error(result.error.message);
              return;
            }
            toast.success("Dispute cancelled.");
            router.refresh();
          });
        }}
        className="inline-flex h-10 items-center justify-center rounded-xl border border-[#dbe3ef] bg-white px-4 text-sm font-bold text-[#0f172a] disabled:opacity-50"
      >
        {pending ? "Cancelling..." : "Cancel open case"}
      </button>
    </div>
  );
}
