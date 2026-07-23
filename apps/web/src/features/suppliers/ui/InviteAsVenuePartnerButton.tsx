"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Building2,
  HandshakeIcon,
  Loader2,
  Star,
  X,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  inviteSupplierAsVenuePartner,
  removeSupplierFromVenue,
} from "@/src/features/suppliers/application/venue-partnership-actions";

type Venue = {
  id: string;
  name: string;
};

type InviteAsVenuePartnerButtonProps = {
  supplierId: string;
  supplierName: string;
  supplierCategory?: string | undefined;
  ownerVenues: Venue[];
  currentPartnerVenueIds: string[];
};

export function InviteAsVenuePartnerButton({
  supplierId,
  supplierName,
  supplierCategory,
  ownerVenues,
  currentPartnerVenueIds,
}: InviteAsVenuePartnerButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedVenueIds, setSelectedVenueIds] = useState<string[]>(
    () => currentPartnerVenueIds,
  );
  const [isPreferred, setIsPreferred] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  const isAlreadyPartner = currentPartnerVenueIds.length > 0;

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function toggleVenue(id: string) {
    setSelectedVenueIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  }

  function openModal() {
    setSelectedVenueIds(currentPartnerVenueIds);
    setIsPreferred(false);
    setStatus("idle");
    setErrorMsg("");
    setOpen(true);
  }

  function closeModal() {
    if (isPending) return;
    setOpen(false);
    setTimeout(() => setStatus("idle"), 300);
  }

  function handleSubmit() {
    setStatus("idle");
    startTransition(async () => {
      const result = await inviteSupplierAsVenuePartner(
        supplierId,
        selectedVenueIds,
        isPreferred,
      );
      if (result.success) {
        setStatus("success");
        setTimeout(closeModal, 1800);
      } else {
        setStatus("error");
        setErrorMsg(result.error);
      }
    });
  }

  if (ownerVenues.length === 0) return null;

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={openModal}
        className={[
          "inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold shadow-sm transition",
          isAlreadyPartner
            ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            : "border border-[#dbe3ef] bg-white text-[#0f172a] hover:border-[#93c5fd] hover:text-[#1d4ed8] shadow-slate-200/60",
        ].join(" ")}
      >
        <HandshakeIcon className="h-4 w-4 shrink-0" />
        {isAlreadyPartner ? "Manage Partnership" : "Invite as Venue Partner"}
      </button>

      {/* Modal */}
      {open && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          aria-modal="true"
          role="dialog"
          aria-labelledby="partner-modal-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal Panel */}
          <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eff6ff]">
                  <HandshakeIcon className="h-5 w-5 text-[#1d4ed8]" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="partner-modal-title"
                    className="truncate text-base font-bold text-[#111827]"
                  >
                    {isAlreadyPartner ? "Manage Partnership" : "Invite as Venue Partner"}
                  </h2>
                  <p className="truncate text-xs font-medium text-[#6b7280]">
                    {supplierName}
                    {supplierCategory ? ` · ${supplierCategory}` : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="shrink-0 rounded-xl p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                disabled={isPending}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-5">
              {/* Venue selection */}
              <div>
                <p className="mb-3 text-sm font-semibold text-[#374151]">
                  Select venues to partner with{" "}
                  <span className="font-bold text-[#1d4ed8]">{supplierName}</span>
                </p>
                <div className="space-y-2">
                  {ownerVenues.map((venue) => {
                    const checked = selectedVenueIds.includes(venue.id);
                    const wasAlready = currentPartnerVenueIds.includes(venue.id);
                    return (
                      <label
                        key={venue.id}
                        className={[
                          "flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition",
                          checked
                            ? "border-[#93c5fd] bg-[#eff6ff]"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleVenue(venue.id)}
                          className="h-4 w-4 rounded border-slate-300 accent-[#1d4ed8]"
                        />
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="truncate text-sm font-semibold text-[#111827]">
                            {venue.name}
                          </span>
                          {wasAlready && (
                            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                              Partner
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Preferred toggle */}
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 transition hover:bg-amber-100">
                <input
                  type="checkbox"
                  checked={isPreferred}
                  onChange={(e) => setIsPreferred(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-amber-300 accent-amber-500"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-sm font-bold text-amber-800">
                      Mark as Preferred Supplier
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-amber-700">
                    Preferred suppliers appear first in recommendations shown to
                    clients during event planning.
                  </p>
                </div>
              </label>

              {/* Status messages */}
              {status === "success" && (
                <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Partnership saved successfully!
                </div>
              )}
              {status === "error" && (
                <div className="flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {errorMsg}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                onClick={closeModal}
                disabled={isPending}
                className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || selectedVenueIds.length === 0}
                className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-2xl bg-[#1d4ed8] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1e40af] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : selectedVenueIds.length === 0 ? (
                  "Select a venue"
                ) : (
                  <>
                    <HandshakeIcon className="h-4 w-4" />
                    Confirm Partnership
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
