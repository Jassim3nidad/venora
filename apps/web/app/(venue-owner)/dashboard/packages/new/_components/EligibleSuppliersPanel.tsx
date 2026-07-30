"use client";

import { useState, useMemo } from "react";
import { Users, Star, MapPin, CheckCircle2, Plus, Minus, CircleDollarSign } from "lucide-react";
import type { EligibleSupplier } from "@/src/features/venues/application/package-queries";

type SelectedSupplier = {
  supplierId: string;
  agreementId: string;
  includedPrice: number;
};

type Props = {
  suppliers: EligibleSupplier[];
  initialSelected?: SelectedSupplier[];
  onChange: (selected: SelectedSupplier[]) => void;
};

export function EligibleSuppliersPanel({
  suppliers,
  initialSelected = [],
  onChange,
}: Props) {
  const [selected, setSelected] = useState<Map<string, SelectedSupplier>>(
    () => new Map(initialSelected.map((item) => [item.supplierId, item])),
  );
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.business_name.toLowerCase().includes(q) ||
        (s.category_name?.toLowerCase().includes(q) ?? false) ||
        (s.province?.toLowerCase().includes(q) ?? false)
    );
  }, [suppliers, search]);

  const toggle = (supplier: EligibleSupplier) => {
    const next = new Map(selected);
    if (next.has(supplier.supplier_id)) {
      next.delete(supplier.supplier_id);
    } else {
      next.set(supplier.supplier_id, {
        supplierId: supplier.supplier_id,
        agreementId: supplier.agreement_id,
        includedPrice:
          supplier.supplier_base_rate + supplier.venue_markup_fee,
      });
    }
    setSelected(next);
    onChange(Array.from(next.values()));
  };

  const totalSupplierCost = Array.from(selected.values()).reduce(
    (sum, s) => sum + s.includedPrice,
    0
  );

  if (suppliers.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-100">
          <Users className="h-6 w-6 text-slate-400" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">No eligible suppliers</h3>
        <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto leading-relaxed font-medium">
          Suppliers need an active venue partnership and an active commercial
          agreement with your venue before they can be included in a package.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by name, category, or province..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Summary bar when suppliers are selected */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-blue-50 border border-blue-200/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-bold text-blue-900">
              {selected.size} supplier{selected.size !== 1 ? "s" : ""} selected
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <CircleDollarSign className="h-4 w-4 text-slate-500" />
            <span className="font-bold text-slate-900">
              +₱{totalSupplierCost.toLocaleString()}
            </span>
            <span className="text-slate-500 font-medium">total supplier cost</span>
          </div>
        </div>
      )}

      {/* Supplier cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((supplier) => {
          const isSelected = selected.has(supplier.supplier_id);
          const totalPrice =
            supplier.supplier_base_rate + supplier.venue_markup_fee;

          return (
            <button
              key={supplier.supplier_id}
              type="button"
              onClick={() => toggle(supplier)}
              className={`group relative text-left rounded-[20px] border p-5 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isSelected
                  ? "border-blue-400 bg-blue-50/60 shadow-md shadow-blue-500/10"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              {/* Selected checkmark */}
              <div
                className={`absolute top-4 right-4 flex h-7 w-7 items-center justify-center rounded-full transition-all ${
                  isSelected
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                }`}
              >
                {isSelected ? (
                  <Minus className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </div>

              <div className="flex items-start gap-3 pr-10">
                {/* Avatar */}
                {supplier.profile_image_url ? (
                  <img
                    src={supplier.profile_image_url}
                    alt={supplier.business_name}
                    className="h-11 w-11 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 font-bold text-lg">
                    {supplier.business_name.charAt(0)}
                  </div>
                )}

                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 truncate">
                    {supplier.business_name}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {supplier.category_name ?? "Service Provider"}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                    {supplier.avg_rating > 0 && (
                      <span className="flex items-center gap-1 text-xs text-amber-600 font-bold">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {Number(supplier.avg_rating).toFixed(1)}
                        <span className="text-slate-400 font-normal">
                          ({supplier.review_count})
                        </span>
                      </span>
                    )}
                    {supplier.province && (
                      <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                        <MapPin className="h-3 w-3" />
                        {supplier.province}
                      </span>
                    )}
                    {supplier.max_guest_count && (
                      <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                        <Users className="h-3 w-3" />
                        Up to {supplier.max_guest_count.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-500 font-medium">
                    {supplier.custom_service_name ?? supplier.service_name ?? "Service"}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Base: ₱{supplier.supplier_base_rate.toLocaleString()}
                    {supplier.venue_markup_fee > 0
                      ? ` + ₱${supplier.venue_markup_fee.toLocaleString()} markup`
                      : ""}
                  </p>
                </div>
                <span
                  className={`text-base font-bold tracking-tight ${
                    isSelected ? "text-blue-600" : "text-slate-900"
                  }`}
                >
                  ₱{totalPrice.toLocaleString()}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && search && (
        <p className="text-center text-sm text-slate-500 py-6">
          No suppliers match &ldquo;{search}&rdquo;
        </p>
      )}
    </div>
  );
}
