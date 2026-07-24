"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { StatusBadge } from "@/components/dashboard/enterprise";
import { cancelAttachedSupplierAction } from "../application/supplier-coordination-actions";

export type BookingSupplierListItem = {
  id: string;
  status: string;
  agreed_price: number | null;
  supplier_profiles: { business_name: string | null } | null;
  supplier_services?: { name: string | null } | null;
};

function formatCurrency(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return null;
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function BookingSuppliersPanel({
  bookingId,
  suppliers,
  assignHref,
  canAttach,
}: {
  bookingId: string;
  suppliers: BookingSupplierListItem[];
  assignHref: string;
  canAttach: boolean;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeSuppliers = suppliers.filter(
    (row) => row.status !== "cancelled",
  );

  const cancelAttachment = (bookingSupplierId: string) => {
    setPendingId(bookingSupplierId);
    startTransition(async () => {
      const result = await cancelAttachedSupplierAction({
        bookingSupplierId,
        bookingId,
      });

      if (result.error) {
        toast.error(result.error.message);
        setPendingId(null);
        return;
      }

      toast.success("Supplier attachment cancelled.");
      setPendingId(null);
      router.refresh();
    });
  };

  return (
    <section className="rounded-[24px] border border-[#e5e7eb] bg-white p-5 shadow-sm shadow-slate-200/60 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black tracking-tight text-[#0f172a]">
            Attached suppliers
          </h2>
          <p className="mt-1 text-sm font-semibold text-[#64748b]">
            Accredited suppliers attached as jobs for this event.
          </p>
        </div>
        {canAttach ? (
          <a
            href={assignHref}
            className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-[#1d4ed8] hover:underline"
          >
            Attach supplier
          </a>
        ) : null}
      </div>
      <div className="mt-4 grid gap-3">
        {activeSuppliers.length > 0 ? (
          activeSuppliers.map((row) => {
            const price = formatCurrency(row.agreed_price);
            return (
              <div
                key={row.id}
                className="rounded-2xl border border-[#e5e7eb] bg-[#f8fbff] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-black text-[#0f172a]">
                      {row.supplier_profiles?.business_name ?? "Supplier"}
                    </p>
                    {row.supplier_services?.name ? (
                      <p className="mt-1 text-xs font-semibold text-[#64748b]">
                        {row.supplier_services.name}
                      </p>
                    ) : null}
                    {price ? (
                      <p className="mt-1 text-xs font-semibold text-[#64748b]">
                        Agreed: {price}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={row.status} />
                    {canAttach && row.status !== "cancelled" ? (
                      <button
                        type="button"
                        disabled={isPending && pendingId === row.id}
                        onClick={() => cancelAttachment(row.id)}
                        className="text-xs font-bold text-red-600 hover:underline disabled:opacity-50"
                      >
                        {isPending && pendingId === row.id
                          ? "Cancelling..."
                          : "Cancel"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="rounded-2xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-4 text-sm font-semibold text-[#475569]">
            No suppliers attached to this booking yet.
            {canAttach
              ? " Attach an accredited venue supplier to create a job."
              : ""}
          </p>
        )}
      </div>
    </section>
  );
}
