import { Check } from "lucide-react";
import { formatCurrency } from "@venora/lib";
import type { VenuePackage } from "../types/venue.types";
import { formatPriceUnit } from "../utils/venue-media";

interface VenuePricingSectionProps {
  basePrice: number;
  priceUnit: string;
  packages?: VenuePackage[];
  className?: string;
}

export default function VenuePricingSection({
  basePrice,
  priceUnit,
  packages = [],
  className = "",
}: VenuePricingSectionProps) {
  const unitLabel = formatPriceUnit(priceUnit);

  return (
    <section className={`space-y-4 ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-sora text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Pricing
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Transparent rates before you reserve.
          </p>
        </div>
        <div className="text-right">
          <p className="font-sora text-2xl font-bold text-[var(--text-primary)]">
            {formatCurrency(basePrice)}
          </p>
          <p className="text-sm text-[var(--text-muted)]">per {unitLabel}</p>
        </div>
      </div>

      {packages.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Available packages
          </p>
          <div className="grid gap-3">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--text-primary)]">{pkg.name}</p>
                    {pkg.description && (
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">
                        {pkg.description}
                      </p>
                    )}
                    {(pkg.min_guests || pkg.max_guests) && (
                      <p className="mt-2 text-xs font-medium text-[var(--text-muted)]">
                        {pkg.min_guests ?? "—"}–{pkg.max_guests ?? "—"} guests
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[var(--text-primary)]">
                      {formatCurrency(pkg.price)}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      per {formatPriceUnit(pkg.price_unit)}
                    </p>
                  </div>
                </div>

                {pkg.inclusions?.length > 0 && (
                  <ul className="mt-3 space-y-1.5 border-t border-[var(--border-default)] pt-3">
                    {pkg.inclusions.slice(0, 4).map((inclusion) => (
                      <li
                        key={inclusion}
                        className="flex items-center gap-2 text-sm text-[var(--text-secondary)]"
                      >
                        <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                        {inclusion}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4 text-sm text-[var(--text-secondary)]">
          Base venue rate applies. Select your event date in the booking panel to see the
          estimated total including platform fees.
        </div>
      )}
    </section>
  );
}
