"use client";

import { formatCurrency } from "@venora/lib";
import { Button } from "@venora/ui";
import { formatPriceUnit } from "../utils/venue-media";

interface VenueMobileBookingBarProps {
  basePrice: number;
  priceUnit: string;
  onReserve: () => void;
}

export default function VenueMobileBookingBar({
  basePrice,
  priceUnit,
  onReserve,
}: VenueMobileBookingBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border-default)] bg-white/95 px-4 py-3 backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div>
          <p className="font-sora text-lg font-bold text-[var(--text-primary)]">
            {formatCurrency(basePrice)}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            per {formatPriceUnit(priceUnit)}
          </p>
        </div>
        <Button
          type="button"
          onClick={onReserve}
          className="h-11 rounded-xl bg-[var(--color-brand-600)] px-6 font-bold text-white hover:bg-[var(--color-brand-700)]"
        >
          Reserve
        </Button>
      </div>
    </div>
  );
}
