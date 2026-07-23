"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { submitPartnershipRequest } from "@/features/suppliers/application/venue-partnership-actions";

export function RequestPartnershipModal({
  venueId,
  venueName,
  supplierId,
  supplierServices,
}: {
  venueId: string;
  venueName: string;
  supplierId: string;
  supplierServices: any[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [commercialTerms, setCommercialTerms] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleService = (id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const res = await submitPartnershipRequest({
      venueId,
      supplierId,
      approvedServices: selectedServices,
      commercialTerms,
    });

    setIsSubmitting(false);

    if (res.success) {
      setIsOpen(false);
      router.refresh();
    } else {
      setError(res.error ?? "Failed to submit request.");
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-[#1d4ed8] px-4 text-sm font-bold text-white transition hover:bg-[#1e40af]"
      >
        Request Partnership
      </button>

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">
                Partner with {venueName}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1">
                <p className="text-sm text-slate-600 mb-6">
                  Select the services you'd like to offer to this venue's clients, and include any proposed commercial terms (e.g. commission rates).
                </p>

                {error && (
                  <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">
                      Proposed Services
                    </label>
                    <div className="space-y-2">
                      {supplierServices.length === 0 && (
                        <p className="text-sm text-slate-500 italic">No active services on your profile.</p>
                      )}
                      {supplierServices.map((service) => (
                        <label key={service.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedServices.includes(service.id)}
                            onChange={() => toggleService(service.id)}
                            className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                          />
                          <div>
                            <p className="text-sm font-bold text-slate-900">{service.name}</p>
                            <p className="text-xs text-slate-500">{service.packageType?.replace(/_/g, " ")}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-2">
                      Commercial Terms (Optional)
                    </label>
                    <textarea
                      value={commercialTerms}
                      onChange={(e) => setCommercialTerms(e.target.value)}
                      placeholder="E.g. We offer a 10% commission on all referred bookings..."
                      rows={3}
                      className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-blue-600 focus:ring-blue-600"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 p-6 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || selectedServices.length === 0}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
