"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { addSupplierServiceAction, deleteSupplierServiceAction } from "../actions";

const PRICE_UNITS = [
  { value: "per_event", label: "Per event" },
  { value: "per_hour", label: "Per hour" },
  { value: "per_pax", label: "Per guest" },
  { value: "per_day", label: "Per day" },
];

export function AddServiceForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      ref={formRef}
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await addSupplierServiceAction({
            name: String(formData.get("name") ?? ""),
            description: String(formData.get("description") ?? ""),
            price: formData.get("price") ? Number(formData.get("price")) : undefined,
            priceUnit: String(formData.get("priceUnit") ?? "") || undefined,
          });
          if (result.error) {
            setError(result.error.message);
            return;
          }
          formRef.current?.reset();
          router.refresh();
        });
      }}
    >
      <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-[#6b7280] sm:col-span-2">
        Service name
        <input
          name="name"
          required
          placeholder="e.g. Full Coverage Photography Package"
          className="h-11 rounded-xl border border-[#e5e7eb] bg-white px-3 text-sm font-medium text-[#111827] outline-none focus:border-[#1d4ed8] focus:ring-4 focus:ring-[#1d4ed8]/10"
        />
      </label>

      <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-[#6b7280]">
        Price (PHP)
        <input
          name="price"
          type="number"
          min="0"
          step="1"
          placeholder="e.g. 25000"
          className="h-11 rounded-xl border border-[#e5e7eb] bg-white px-3 text-sm font-medium text-[#111827] outline-none focus:border-[#1d4ed8] focus:ring-4 focus:ring-[#1d4ed8]/10"
        />
      </label>

      <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-[#6b7280]">
        Price unit
        <select
          name="priceUnit"
          defaultValue="per_event"
          className="h-11 rounded-xl border border-[#e5e7eb] bg-white px-3 text-sm font-semibold text-[#111827] outline-none focus:border-[#1d4ed8] focus:ring-4 focus:ring-[#1d4ed8]/10"
        >
          {PRICE_UNITS.map((unit) => (
            <option key={unit.value} value={unit.value}>
              {unit.label}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-[#6b7280] sm:col-span-2">
        Description
        <textarea
          name="description"
          rows={3}
          placeholder="What's included in this service..."
          className="resize-y rounded-xl border border-[#e5e7eb] bg-white p-3 text-sm font-medium text-[#111827] outline-none focus:border-[#1d4ed8] focus:ring-4 focus:ring-[#1d4ed8]/10"
        />
      </label>

      {error ? (
        <p className="sm:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
          {error}
        </p>
      ) : null}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1d4ed8] px-5 text-sm font-bold text-white transition hover:bg-[#1e40af] disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add Service
        </button>
      </div>
    </form>
  );
}

export function DeleteServiceButton({ serviceId }: { serviceId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await deleteSupplierServiceAction({ serviceId });
          router.refresh();
        });
      }}
      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
      aria-label="Delete service"
    >
      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      Remove
    </button>
  );
}
