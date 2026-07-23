"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { assignSupplierToBooking } from "../application/supplier-coordination-actions";

type SupplierOption = {
  id: string;
  businessName: string;
};

export function AssignSupplierForm({
  bookingId,
  suppliers,
}: {
  bookingId: string;
  suppliers: SupplierOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);

    const supplierId = fd.get("supplierId") as string;
    const serviceDate = fd.get("serviceDate") as string;
    const arrivalTime = fd.get("arrivalTime") as string;
    const notes = fd.get("notes") as string;

    try {
      await assignSupplierToBooking(
        bookingId,
        supplierId,
        serviceDate,
        arrivalTime,
        notes
      );
      router.push(`/dashboard/coordinator/bookings/${bookingId}`);
    } catch (err: any) {
      setError(err.message || "Failed to assign supplier");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm font-semibold text-red-800">
          {error}
        </div>
      )}
      
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
      </div>

      <div className="grid gap-2">
        <label htmlFor="serviceDate" className="text-sm font-bold text-[#0f172a]">
          Service Date (Optional)
        </label>
        <input
          type="date"
          id="serviceDate"
          name="serviceDate"
          className="h-11 rounded-xl border border-[#e5e7eb] px-3 text-sm font-medium focus:border-[#1d4ed8] focus:ring-4 focus:ring-[#1d4ed8]/10"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="arrivalTime" className="text-sm font-bold text-[#0f172a]">
          Expected Arrival Time (Optional)
        </label>
        <input
          type="time"
          id="arrivalTime"
          name="arrivalTime"
          className="h-11 rounded-xl border border-[#e5e7eb] px-3 text-sm font-medium focus:border-[#1d4ed8] focus:ring-4 focus:ring-[#1d4ed8]/10"
        />
      </div>

      <div className="grid gap-2">
        <label htmlFor="notes" className="text-sm font-bold text-[#0f172a]">
          Coordination Notes (Optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          placeholder="e.g. Needs to use the loading dock on the east side..."
          className="rounded-xl border border-[#e5e7eb] p-3 text-sm font-medium focus:border-[#1d4ed8] focus:ring-4 focus:ring-[#1d4ed8]/10"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1d4ed8] px-5 text-sm font-bold text-white transition hover:bg-[#1e40af] disabled:opacity-50"
        >
          {loading ? "Assigning..." : "Assign Supplier"}
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
