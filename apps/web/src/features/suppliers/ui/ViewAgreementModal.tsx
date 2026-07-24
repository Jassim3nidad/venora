"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogClose, Badge, Button } from "@venora/ui";
import { X, Handshake, CircleDollarSign, Settings, FileText, CheckCircle2, Clock, XCircle, AlertCircle, Building, Users, Loader2 } from "lucide-react";
import { MaterialIcon } from "@/components/dashboard/enterprise";
import { cancelAgreement } from "@/src/features/suppliers/application/commercial-agreement-actions";
import { toast } from "sonner";

type Agreement = {
  id: string;
  custom_service_name: string | null;
  service_id: string | null;
  supplier_base_rate: number;
  venue_markup_fee: number;
  overtime_rate: number | null;
  travel_fees: number | null;
  max_guest_count: number | null;
  required_lead_time_days: number | null;
  setup_requirements: string | null;
  cancellation_terms: string | null;
  rescheduling_terms: string | null;
  status: "draft" | "proposed" | "active" | "rejected" | "expired";
  created_at: string;
};

const statusConfig = {
  proposed: { color: "bg-amber-100 text-amber-800", icon: Clock, label: "Pending Supplier" },
  active: { color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2, label: "Active" },
  rejected: { color: "bg-red-100 text-red-800", icon: XCircle, label: "Rejected" },
  expired: { color: "bg-slate-100 text-slate-800", icon: AlertCircle, label: "Expired" },
  draft: { color: "bg-slate-100 text-slate-800", icon: FileText, label: "Draft" },
};

export function ViewAgreementModal({
  agreement,
  supplierName,
  venueName,
  isOpen,
  onOpenChange,
}: {
  agreement: Agreement | null;
  supplierName: string;
  venueName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  if (!agreement) return null;

  const config = statusConfig[agreement.status] || statusConfig.draft;
  const Icon = config.icon;

  const total = Number(agreement.supplier_base_rate) + Number(agreement.venue_markup_fee);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-slate-50 sm:rounded-[32px] [&>button]:hidden shadow-2xl border-0">
        <div className="flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="relative px-6 py-8 bg-white border-b border-slate-100 flex items-start justify-between">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-transparent pointer-events-none" />
            <div className="relative z-10 flex gap-4 items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100/50 border border-blue-200/50 shadow-sm text-blue-600">
                <Handshake className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                  {agreement.custom_service_name || "Standard Service"}
                  <Badge className={`${config.color} border-0 shadow-none font-bold rounded-lg px-2 py-0.5 flex items-center gap-1`}>
                    <Icon className="h-3.5 w-3.5" />
                    {config.label}
                  </Badge>
                </DialogTitle>
                <p className="text-sm text-slate-500 font-medium mt-1">
                  Agreement between <strong className="text-slate-700">{supplierName}</strong> and <strong className="text-slate-700">{venueName}</strong>
                </p>
              </div>
            </div>
            <DialogClose asChild>
              <button className="relative z-10 rounded-full p-2 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shadow-sm border border-slate-200/50">
                <X className="h-5 w-5" />
              </button>
            </DialogClose>
          </div>

          <div className="overflow-y-auto p-6 space-y-8">
            {/* Financial Terms */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-600">
                  <CircleDollarSign className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Financial Terms</h3>
              </div>

              <div className="bg-white p-5 rounded-[22px] border border-slate-200 shadow-sm">
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
                  <div>
                    <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Supplier Base Rate</span>
                    <p className="text-lg font-bold text-slate-900 mt-1">₱{Number(agreement.supplier_base_rate).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Venue Markup</span>
                    <p className="text-lg font-bold text-slate-900 mt-1">₱{Number(agreement.venue_markup_fee).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase text-blue-600 tracking-wider">Total Package Price</span>
                    <p className="text-xl font-black text-blue-600 mt-1">₱{total.toLocaleString()}</p>
                  </div>
                </div>

                {(agreement.overtime_rate || agreement.travel_fees) && (
                  <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-2 gap-6">
                    {agreement.overtime_rate && (
                      <div>
                        <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Overtime Rate</span>
                        <p className="text-sm font-bold text-slate-700 mt-1">₱{Number(agreement.overtime_rate).toLocaleString()} / hour</p>
                      </div>
                    )}
                    {agreement.travel_fees && (
                      <div>
                        <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Travel Fees</span>
                        <p className="text-sm font-bold text-slate-700 mt-1">₱{Number(agreement.travel_fees).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Operational Rules */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-100 text-blue-600">
                  <Settings className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Operational Rules</h3>
              </div>
              
              <div className="bg-white p-5 rounded-[22px] border border-slate-200 shadow-sm space-y-6">
                {(agreement.max_guest_count || agreement.required_lead_time_days) && (
                  <div className="flex gap-8">
                    {agreement.max_guest_count && (
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-slate-400" />
                        <div>
                          <p className="text-xs font-bold uppercase text-slate-400">Max Guests</p>
                          <p className="text-sm font-bold text-slate-900">{agreement.max_guest_count} people</p>
                        </div>
                      </div>
                    )}
                    {agreement.required_lead_time_days && (
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-slate-400" />
                        <div>
                          <p className="text-xs font-bold uppercase text-slate-400">Lead Time</p>
                          <p className="text-sm font-bold text-slate-900">{agreement.required_lead_time_days} days min.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {agreement.setup_requirements && (
                  <div>
                    <h4 className="text-xs font-bold uppercase text-slate-400 mb-1">Setup Requirements</h4>
                    <p className="text-sm font-medium text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">{agreement.setup_requirements}</p>
                  </div>
                )}

                {agreement.cancellation_terms && (
                  <div>
                    <h4 className="text-xs font-bold uppercase text-slate-400 mb-1">Cancellation Terms</h4>
                    <p className="text-sm font-medium text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">{agreement.cancellation_terms}</p>
                  </div>
                )}

                {agreement.rescheduling_terms && (
                  <div>
                    <h4 className="text-xs font-bold uppercase text-slate-400 mb-1">Rescheduling Terms</h4>
                    <p className="text-sm font-medium text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">{agreement.rescheduling_terms}</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Footer for active agreements */}
        {agreement.status === "active" && (
          <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-between items-center gap-3">
            {!showCancelConfirm ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCancelConfirm(true)}
                className="rounded-xl h-11 px-5 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 font-bold transition-colors"
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
                    variant="outline"
                    onClick={() => setShowCancelConfirm(false)}
                    className="rounded-xl h-9 px-4 text-sm font-bold"
                  >
                    No, keep it
                  </Button>
                  <Button
                    disabled={isCancelling}
                    onClick={async () => {
                      setIsCancelling(true);
                      const result = await cancelAgreement({ agreementId: agreement.id });
                      setIsCancelling(false);
                      if (result.success) {
                        toast.success("Agreement cancelled. Both parties have been notified.");
                        onOpenChange(false);
                      } else {
                        toast.error(result.error || "Failed to cancel agreement.");
                      }
                    }}
                    className="rounded-xl h-9 px-4 text-sm font-bold bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, cancel"}
                  </Button>
                </div>
              </div>
            )}
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl h-11 px-5 border-slate-200 text-slate-700 hover:bg-slate-50 font-bold"
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
