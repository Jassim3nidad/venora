"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { attachSupplierToBookingAction } from "../application/supplier-coordination-actions";

type SupplierOption = {
  id: string;
  businessName: string;
};

export function AssignSupplierForm({
  bookingId,
  suppliers,
  returnTo,
}: {
  bookingId: string;
  suppliers: SupplierOption[];
  returnTo: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);

    const supplierId = String(fd.get("supplierId") ?? "");
    const agreedPriceRaw = String(fd.get("agreedPrice") ?? "").trim();
    const agreedPrice =
      agreedPriceRaw.length > 0 ? Number(agreedPriceRaw) : null;

    const result = await attachSupplierToBookingAction({
      bookingId,
      supplierId,
      agreedPrice: Number.isFinite(agreedPrice as number)
        ? agreedPrice
        : null,
    });

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    router.push(returnTo);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      {error ? (
        <div className="rounded-lg bg-red-50 p-4 text-sm font-semibold text-red-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-2">
        <label htmlFor="supplierId" className="text-sm font-bold text-[#0f172a]">
          Supplier
        </label>
        <select
          id="supplierId"
          name="supplierId"
          required
          className="h-11 rounded-xl border border-[#e5e7eb] px-3 text-sm font-medium focus:border-[#1d4ed8] focus:ring-4 focus:ring-[#1d4ed8]/10"
        >
          <option value="">Select an accredited supplier</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.businessName}
            </option>
          ))}
        </select>
        <p className="text-xs font-semibold text-[#64748b]">
          Only accredited suppliers associated with this venue appear here.
          Attachment creates a confirmed job on the supplier dashboard.
        </p>
      </div>

      <div className="grid gap-2">
        <label
          htmlFor="agreedPrice"
          className="text-sm font-bold text-[#0f172a]"
        >
          Agreed price (Optional)
        </label>
        <input
          type="number"
          id="agreedPrice"
          name="agreedPrice"
          min="0"
          step="0.01"
          placeholder="0.00"
          className="h-11 rounded-xl border border-[#e5e7eb] px-3 text-sm font-medium focus:border-[#1d4ed8] focus:ring-4 focus:ring-[#1d4ed8]/10"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading || suppliers.length === 0}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1d4ed8] px-5 text-sm font-bold text-white transition hover:bg-[#1e40af] disabled:opacity-50"
        >
          {loading ? "Attaching..." : "Attach supplier"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          disabled={loading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#dbe3ef] bg-white px-5 text-sm font-bold text-[#0f172a] shadow-sm shadow-slate-200/60 transition hover:border-[#93c5fd] hover:text-[#1d4ed8] disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
