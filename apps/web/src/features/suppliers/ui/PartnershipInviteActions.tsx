"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { respondToPartnershipInvite } from "@/src/features/suppliers/application/venue-partnership-actions";

export function PartnershipInviteActions({
  partnershipId,
}: {
  partnershipId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (decision: "active" | "declined") => {
    setError(null);
    startTransition(async () => {
      const result = await respondToPartnershipInvite(partnershipId, decision);
      if (!result.success) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success(
        decision === "active"
          ? "Partnership accepted. You can now receive commercial agreements and package inclusions."
          : "Invitation declined.",
      );
      router.refresh();
    });
  };

  return (
    <div className="mt-4 space-y-2 border-t border-blue-100 pt-3">
      {error ? (
        <p className="text-xs font-semibold text-red-600">{error}</p>
      ) : null}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run("declined")}
          className="rounded-lg px-3 py-1.5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
        >
          Decline
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run("active")}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? "Saving..." : "Accept Invite"}
        </button>
      </div>
    </div>
  );
}
