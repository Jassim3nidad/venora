"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createMarketplaceFlagAction } from "../application/actions";
import type { CreateMarketplaceFlagInput } from "../schemas/marketplace-flag.schema";

export function CreateFlagButton({
  entityType,
  entityId,
  flagType,
  label,
}: {
  entityType: CreateMarketplaceFlagInput["entityType"];
  entityId: string;
  flagType: CreateMarketplaceFlagInput["flagType"];
  label: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await createMarketplaceFlagAction({
        entityType,
        entityId,
        flagType,
        severity: "medium",
        notes: notes.trim() || undefined,
      });
      if (result.error) {
        toast.error(result.error.message);
        return;
      }
      toast.success(`${label} flagged for review`);
      setIsOpen(false);
      setNotes("");
      router.refresh();
    });
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-7 items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 text-xs font-bold text-amber-800 hover:bg-amber-100"
      >
        <Flag className="h-3 w-3" />
        Flag
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional note"
        disabled={isPending}
        className="h-7 w-40 rounded-lg border border-[#dbe3ef] px-2 text-xs"
      />
      <button
        type="button"
        onClick={submit}
        disabled={isPending}
        className="inline-flex h-7 items-center rounded-lg bg-[#1d4ed8] px-2 text-xs font-bold text-white disabled:opacity-50"
      >
        {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm"}
      </button>
      <button
        type="button"
        onClick={() => setIsOpen(false)}
        disabled={isPending}
        className="text-xs font-bold text-[#6b7280]"
      >
        Cancel
      </button>
    </div>
  );
}
