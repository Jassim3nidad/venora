"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogClose, Button } from "@venora/ui";
import { X, Loader2, CheckCircle2, AlertCircle, CircleDollarSign, Handshake, Settings, ShieldAlert, ArrowRight } from "lucide-react";
import { respondToAgreement, cancelAgreement } from "@/src/features/suppliers/application/commercial-agreement-actions";
import { toast } from "sonner";

type Agreement = {
  id: string;
  status: string;
  custom_service_name: string | null;
  service_id: string | null;
  supplier_base_rate: number;
  venue_markup_fee: number;
  max_guest_count: number | null;
  overtime_rate: number | null;
  travel_fees: number | null;
  setup_requirements: string | null;
  cancellation_terms: string | null;
  rescheduling_terms: string | null;
  venues?: { name: string };
};

type Props = {
  agreement: Agreement;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ReviewAgreementModal({
  agreement,
  isOpen,
  onOpenChange,
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const venueName = agreement.venues?.name || "the venue";

  const handleAction = async (status: "active" | "rejected") => {
    setIsSubmitting(true);
    const result = await respondToAgreement({
      agreementId: agreement.id,
      status,
    });
    setIsSubmitting(false);

    if (result.success) {
      toast.success(status === "active" ? "Agreement accepted!" : "Agreement rejected.");
      onOpenChange(false);
    } else {
      toast.error(result.error || "Failed to update agreement.");
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    const result = await cancelAgreement({ agreementId: agreement.id });
    setIsCancelling(false);
    if (result.success) {
      toast.success("Agreement cancelled. Both parties have been notified.");
      setShowCancelConfirm(false);
      onOpenChange(false);
    } else {
      toast.error(result.error || "Failed to cancel agreement.");
    }
  };

  const total = Number(agreement.supplier_base_rate) + Number(agreement.venue_markup_fee);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-slate-50 sm:rounded-[32px] [&>button]:hidden shadow-2xl border-0">
        <div className="flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="relative px-6 py-8 bg-white border-b border-slate-100 flex items-start justify-between">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/50 to-transparent pointer-events-none" />
            <div className="relative z-10 flex gap-4 items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100/50 border border-emerald-200/50 shadow-sm text-emerald-600">
                <Handshake className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">
                  Review Agreement
                </DialogTitle>
                <p className="text-sm text-slate-500 font-medium mt-0.5">
                  Proposal from <strong className="text-slate-700">{venueName}</strong>
                </p>
              </div>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                className="relative z-10 rounded-full p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shadow-sm border border-slate-200/50"
              >
                <X className="h-5 w-5" />
              </button>
            </DialogClose>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-10">
            {/* Banner based on status */}
            {agreement.status === "proposed" && (
              <div className="bg-amber-50/80 p-5 rounded-2xl border border-amber-200/50 flex gap-4 items-start shadow-sm">
                <div className="bg-amber-100 text-amber-600 p-2 rounded-xl shrink-0">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-amber-900 font-bold">Action Required</h4>
                  <p className="text-amber-800/80 text-sm mt-1 leading-relaxed">
                    <strong>{venueName}</strong> has proposed commercial terms for your service. Please review your payout and the operational requirements carefully before accepting.
                  </p>
                </div>
              </div>
            )}
            
            {agreement.status === "active" && (
              <div className="bg-emerald-50/80 p-5 rounded-2xl border border-emerald-200/50 flex gap-4 items-start shadow-sm">
                <div className="bg-emerald-100 text-emerald-600 p-2 rounded-xl shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-emerald-900 font-bold">Agreement Active</h4>
                  <p className="text-emerald-800/80 text-sm mt-1 leading-relaxed">
                    You have accepted this agreement. These terms apply to all bookings for this service.
                  </p>
                </div>
              </div>
            )}

            {agreement.status === "rejected" && (
              <div className="bg-red-50/80 p-5 rounded-2xl border border-red-200/50 flex gap-4 items-start shadow-sm">
                <div className="bg-red-100 text-red-600 p-2 rounded-xl shrink-0">
                  <X className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-red-900 font-bold">Agreement Rejected</h4>
                  <p className="text-red-800/80 text-sm mt-1 leading-relaxed">
                    You have rejected this proposal.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-10">
              {/* Service Details */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-blue-600">
                    <Settings className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Service Scope</h3>
                </div>
                <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-2xl font-black text-slate-900 tracking-tight">
                    {agreement.custom_service_name || "Standard Package"}
                  </p>
                </div>
              </section>

              {/* Financial Summary */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-600">
                    <CircleDollarSign className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Financial Terms</h3>
                </div>

                <div className="bg-white p-1 rounded-[24px] shadow-sm border border-slate-200 relative overflow-hidden transition-shadow hover:shadow-md">
                  <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />
                  
                  <div className="bg-white p-6 sm:p-8 rounded-[22px] relative z-10">
                    
                    <div className="flex flex-col md:flex-row justify-between md:items-end gap-6 mb-8 border-b border-slate-100 pb-8">
                      <div>
                        <p className="text-sm font-bold uppercase tracking-wider text-emerald-600 mb-2">Your Payout</p>
                        <p className="text-5xl font-black text-slate-900 tracking-tighter">₱{Number(agreement.supplier_base_rate).toLocaleString()}</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 w-full sm:w-auto sm:min-w-[240px]">
                        <div className="flex justify-between items-center gap-4 mb-1">
                          <span className="text-slate-500 text-sm font-medium whitespace-nowrap">Customer Pays</span>
                          <span className="text-slate-900 font-bold whitespace-nowrap">₱{total.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center gap-4">
                          <span className="text-slate-400 text-sm whitespace-nowrap">Venue Markup</span>
                          <span className="text-slate-500 font-medium whitespace-nowrap">₱{Number(agreement.venue_markup_fee).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {agreement.overtime_rate ? (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <p className="text-xs font-bold uppercase text-slate-500 mb-1">Overtime / hr</p>
                          <p className="font-bold text-slate-900">₱{Number(agreement.overtime_rate).toLocaleString()}</p>
                        </div>
                      ) : null}
                      {agreement.travel_fees ? (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <p className="text-xs font-bold uppercase text-slate-500 mb-1">Travel Fees</p>
                          <p className="font-bold text-slate-900">₱{Number(agreement.travel_fees).toLocaleString()}</p>
                        </div>
                      ) : null}
                      {agreement.max_guest_count ? (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                          <p className="text-xs font-bold uppercase text-slate-500 mb-1">Max Guests</p>
                          <p className="font-bold text-slate-900">{agreement.max_guest_count} persons</p>
                        </div>
                      ) : null}
                    </div>

                  </div>
                </div>
              </section>

              {/* Operational Terms */}
              {(agreement.setup_requirements || agreement.cancellation_terms || agreement.rescheduling_terms) && (
                <section className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-100 text-purple-600">
                      <ShieldAlert className="h-3.5 w-3.5" />
                    </div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Operational Terms</h3>
                  </div>
                  
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                    {agreement.setup_requirements && (
                      <div className="p-5 sm:p-6 hover:bg-slate-50 transition-colors">
                        <p className="text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider">Setup Requirements</p>
                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{agreement.setup_requirements}</p>
                      </div>
                    )}
                    {agreement.cancellation_terms && (
                      <div className="p-5 sm:p-6 hover:bg-slate-50 transition-colors">
                        <p className="text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider">Cancellation Terms</p>
                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{agreement.cancellation_terms}</p>
                      </div>
                    )}
                    {agreement.rescheduling_terms && (
                      <div className="p-5 sm:p-6 hover:bg-slate-50 transition-colors">
                        <p className="text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider">Rescheduling Terms</p>
                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{agreement.rescheduling_terms}</p>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-5 border-t border-slate-200 bg-white flex flex-col-reverse sm:flex-row justify-between items-center shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] relative z-10 gap-4">
            {agreement.status === "proposed" ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => handleAction("rejected")}
                  className="w-full sm:w-auto rounded-xl h-12 px-6 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold transition-colors"
                >
                  Reject Proposal
                </Button>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                  <p className="text-xs text-slate-500 font-medium hidden sm:block">
                    By accepting, you agree to fulfill this service under these terms.
                  </p>
                  <Button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleAction("active")}
                    className="w-full sm:w-auto rounded-xl h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 shadow-md shadow-emerald-500/20 group"
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                    )}
                    Accept Terms
                    {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex justify-between w-full gap-3">
                {!showCancelConfirm ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCancelConfirm(true)}
                    className="w-full sm:w-auto rounded-xl h-12 px-6 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold transition-colors"
                  >
                    Cancel Agreement
                  </Button>
                ) : (
                  <div className="flex items-center gap-3 flex-1">
                    <p className="text-xs text-red-600 font-medium">
                      This will expire the agreement and notify both parties. Continue?
                    </p>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCancelConfirm(false)}
                        className="rounded-xl h-10 px-4 text-sm font-bold"
                      >
                        No, keep it
                      </Button>
                      <Button
                        type="button"
                        disabled={isCancelling}
                        onClick={handleCancel}
                        className="rounded-xl h-10 px-4 text-sm font-bold bg-red-600 hover:bg-red-700 text-white"
                      >
                        {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, cancel"}
                      </Button>
                    </div>
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="w-full sm:w-auto rounded-xl h-12 px-6 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold"
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
