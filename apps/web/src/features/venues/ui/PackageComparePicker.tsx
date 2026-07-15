"use client";

import { useState } from "react";
import { Scale, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@venora/ui";
import PackageComparisonTable from "./PackageComparisonTable";
import { usePackageComparison } from "../hooks/use-package-comparison";

const MAX_COMPARE = 4;
const MIN_COMPARE = 2;

interface ComparablePackage {
  id: string;
  name: string;
  price: number;
  price_unit: string;
}

interface PackageComparePickerProps {
  packages: ComparablePackage[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function PackageComparePicker({
  packages,
}: PackageComparePickerProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [limitNotice, setLimitNotice] = useState(false);
  const { mutate, data, error, isPending, reset } = usePackageComparison();

  if (packages.length < MIN_COMPARE) return null;

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((existing) => existing !== id);
      if (prev.length >= MAX_COMPARE) {
        setLimitNotice(true);
        setTimeout(() => setLimitNotice(false), 2500);
        return prev;
      }
      return [...prev, id];
    });
  }

  function handleCompare() {
    reset();
    setOpen(true);
    mutate({ packageIds: selectedIds });
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-sora text-xl font-bold tracking-tight text-[var(--text-primary)]">
          Compare Packages
        </h3>
        <button
          type="button"
          onClick={handleCompare}
          disabled={selectedIds.length < MIN_COMPARE}
          className="flex h-10 items-center gap-2 rounded-xl bg-[var(--color-brand-600)] px-4 text-xs font-bold text-white transition hover:bg-[var(--color-brand-700)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Scale className="h-3.5 w-3.5" />
          Compare Selected ({selectedIds.length})
        </button>
      </div>

      {limitNotice && (
        <p className="text-xs font-medium text-amber-600">
          You can compare up to {MAX_COMPARE} packages at a time.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {packages.map((pkg) => {
          const checked = selectedIds.includes(pkg.id);
          return (
            <label
              key={pkg.id}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border p-4 transition ${
                checked
                  ? "border-[var(--color-brand-500)] bg-[#EFF6FF]"
                  : "border-[var(--border-default)] bg-white hover:border-[#BFDBFE]"
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleSelection(pkg.id)}
                  className="h-4 w-4 rounded border-[var(--border-default)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-500)]/30"
                />
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {pkg.name}
                </span>
              </div>
              <span className="text-sm font-bold text-[var(--text-primary)]">
                {formatCurrency(pkg.price)}
              </span>
            </label>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[720px] rounded-3xl border border-[var(--border-default)] bg-[var(--bg-base)] p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-sora text-xl font-bold tracking-tight text-[var(--text-primary)]">
              Package Comparison
            </DialogTitle>
            <DialogDescription className="text-sm text-[var(--text-secondary)] mt-1">
              Side-by-side pricing, guest range, and inclusions for your
              selected packages.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {isPending ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm font-medium text-[var(--text-muted)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Comparing packages...
              </div>
            ) : error ? (
              <div className="p-3.5 rounded-xl border border-red-200/20 bg-red-500/10 text-red-600 text-xs font-medium">
                ⚠️ {error.message}
              </div>
            ) : data ? (
              <PackageComparisonTable result={data} />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
