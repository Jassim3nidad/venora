"use client";

import { useState } from "react";
import { Button, Badge } from "@venora/ui";
import { FileText, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import { ReviewAgreementModal } from "./ReviewAgreementModal";

type Agreement = {
  id: string;
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
  status: "draft" | "proposed" | "active" | "rejected" | "expired";
  created_at: string;
  venues?: { name: string };
};

type Props = {
  agreements: Agreement[];
};

const statusConfig = {
  proposed: { color: "bg-amber-100 text-amber-800", icon: Clock, label: "Requires Review" },
  active: { color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2, label: "Active" },
  rejected: { color: "bg-red-100 text-red-800", icon: XCircle, label: "Rejected" },
  expired: { color: "bg-slate-100 text-slate-800", icon: AlertCircle, label: "Expired" },
  draft: { color: "bg-slate-100 text-slate-800", icon: FileText, label: "Draft" },
};

export function SupplierAgreementsList({ agreements }: Props) {
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);

  if (agreements.length === 0) {
    return null; // Or return an empty state if we want to show it when empty
  }

  return (
    <div className="mt-8 space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-[-0.04em] text-slate-900 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          Commercial Agreements
        </h2>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Review and manage the commercial terms for your services with partner venues.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {agreements.map((agreement) => {
          const config = statusConfig[agreement.status] || statusConfig.draft;
          const Icon = config.icon;
          const venueName = agreement.venues?.name || "Venue";
          const isPending = agreement.status === "proposed";
          
          return (
            <div
              key={agreement.id}
              className={`group relative overflow-hidden rounded-[24px] border ${isPending ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200 bg-white'} p-6 shadow-sm transition-all hover:shadow-md ${isPending ? 'hover:border-amber-300' : 'hover:border-slate-300'} flex flex-col justify-between`}
            >
              {/* Status indicator line */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.color.split(' ')[0]} opacity-50`} />

              <div className="space-y-4 mb-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{venueName}</span>
                    <h4 className="font-bold text-slate-900 text-lg tracking-tight mt-0.5">
                      {agreement.custom_service_name || "Standard Service"}
                    </h4>
                  </div>
                  <Badge className={`${config.color} border-0 shadow-none font-bold rounded-lg px-2.5 py-0.5 flex items-center gap-1.5 shrink-0`}>
                    <Icon className="h-3.5 w-3.5" />
                    {config.label}
                  </Badge>
                </div>

                <div className={`rounded-xl border ${isPending ? 'border-amber-100 bg-white' : 'border-slate-100 bg-slate-50/50'} p-4 space-y-2`}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 font-medium">Your Payout</span>
                    <span className="font-bold text-emerald-600 text-base">₱{Number(agreement.supplier_base_rate).toLocaleString()}</span>
                  </div>
                  <div className="h-px w-full bg-slate-100" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 font-medium">Customer Price</span>
                    <span className="font-bold text-slate-900">₱{(Number(agreement.supplier_base_rate) + Number(agreement.venue_markup_fee)).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <Button 
                variant={isPending ? "default" : "outline"}
                className={`w-full rounded-xl font-bold h-11 ${isPending ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20' : 'border-slate-200 text-slate-600 group-hover:bg-slate-50 transition-colors'}`}
                onClick={() => setSelectedAgreement(agreement)}
              >
                {isPending ? "Review Terms" : "View Details"}
              </Button>
            </div>
          );
        })}
      </div>

      {selectedAgreement && (
        <ReviewAgreementModal
          agreement={selectedAgreement}
          isOpen={!!selectedAgreement}
          onOpenChange={(open) => !open && setSelectedAgreement(null)}
        />
      )}
    </div>
  );
}
