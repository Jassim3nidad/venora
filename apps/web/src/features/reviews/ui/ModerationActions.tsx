"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  removeReviewAction,
  restoreReviewAction,
} from "../application/admin-actions";

export function ModerationActions({
  reviewId,
  status,
}: {
  reviewId: string;
  status: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRestore() {
    startTransition(async () => {
      const result = await restoreReviewAction({ reviewId });
      if (result.error) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Review restored");
      router.refresh();
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeReviewAction({ reviewId });
      if (result.error) {
        toast.error(result.error.message);
        return;
      }
      toast.success("Review removed");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      {status !== "published" ? (
        <button
          type="button"
          disabled={isPending}
          onClick={handleRestore}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          Restore
        </button>
      ) : null}
      {status !== "removed" ? (
        <button
          type="button"
          disabled={isPending}
          onClick={handleRemove}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          Remove
        </button>
      ) : null}
    </div>
  );
}
