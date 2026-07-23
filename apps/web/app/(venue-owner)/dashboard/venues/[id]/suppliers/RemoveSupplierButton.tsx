"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { removeSupplierFromVenue } from "@/src/features/suppliers/application/venue-partnership-actions";

export function RemoveSupplierButton({
  supplierId,
  venueId,
}: {
  supplierId: string;
  venueId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleRemove() {
    if (!confirm("Remove this supplier from the venue?")) return;
    startTransition(async () => {
      await removeSupplierFromVenue(supplierId, venueId);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleRemove}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
      title="Remove from this venue"
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Trash2 className="h-3.5 w-3.5" />
      )}
      Remove
    </button>
  );
}
