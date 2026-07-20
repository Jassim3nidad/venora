"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { toggleSupplierFavoriteAction } from "../application/actions";

type SupplierFavoriteButtonProps = {
  supplierId: string;
  supplierName: string;
  initialIsFavorited?: boolean;
  className?: string;
};

export function SupplierFavoriteButton({
  supplierId,
  supplierName,
  initialIsFavorited = false,
  className = "",
}: SupplierFavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const [isPending, setIsPending] = useState(false);

  const handleToggle = async () => {
    setIsFavorited((current) => !current);
    setIsPending(true);

    const result = await toggleSupplierFavoriteAction({ supplierId });

    setIsPending(false);

    if (result.error) {
      setIsFavorited((current) => !current);
      return;
    }

    setIsFavorited(Boolean(result.data?.isFavorited));
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      aria-pressed={isFavorited}
      aria-label={
        isFavorited
          ? `Remove ${supplierName} from favorites`
          : `Save ${supplierName} to favorites`
      }
      className={[
        "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold transition disabled:cursor-wait disabled:opacity-70",
        isFavorited
          ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
          : "border-white/20 bg-white/95 text-slate-950 hover:bg-white",
        className,
      ].join(" ")}
    >
      <Heart className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
      {isFavorited ? "Saved" : "Save supplier"}
    </button>
  );
}
