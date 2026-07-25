"use client";

import { useState } from "react";
import { Button, Badge } from "@venora/ui";
import { Plus, FileText, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import { ProposeAgreementModal } from "./ProposeAgreementModal";
import { ViewAgreementModal } from "./ViewAgreementModal";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

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

type Props = {
  agreements: Agreement[];
  supplierId: string;
  supplierName: string;
  venueId: string;
  venueName: string;
  supplierServices?: { id: string; name: string; basePrice: number | null }[];
  canManage: boolean;
};

const statusConfig = {
  proposed: { color: "bg-amber-100 text-amber-800", icon: Clock, label: "Pending Supplier" },
  active: { color: "bg-emerald-100 text-emerald-800", icon: CheckCircle2, label: "Active" },
  rejected: { color: "bg-red-100 text-red-800", icon: XCircle, label: "Rejected" },
  expired: { color: "bg-slate-100 text-slate-800", icon: AlertCircle, label: "Expired" },
  draft: { color: "bg-slate-100 text-slate-800", icon: FileText, label: "Draft" },
};

export function CommercialAgreementsList({
  agreements,
  supplierId,
  supplierName,
  venueId,
  venueName,
  supplierServices,
  canManage,
}: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (searchParams?.get("action") === "propose-agreement" && canManage) {
      setIsModalOpen(true);
      // Clean up the URL to prevent reopening on subsequent renders
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, canManage, router, pathname]);

  return (
    <div className="mt-12 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-[-0.04em] text-slate-900">
            Commercial Agreements
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Agreed terms and rates for this supplier's services.
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => setIsModalOpen(true)}
            className="rounded-xl font-bold bg-[#111827] text-white hover:bg-[#374151]"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Agreement
          </Button>
        )}
      </div>

      {agreements.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center sm:p-12 transition-all hover:bg-slate-50">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-100">
            <FileText className="h-6 w-6 text-blue-500" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No agreements yet</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto leading-relaxed font-medium">
            Propose a commercial agreement to define the base rate, markup, and scope of service.
          </p>
          {canManage && (
            <Button
              onClick={() => setIsModalOpen(true)}
              variant="outline"
              className="mt-6 rounded-xl font-bold border-slate-200 shadow-sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create First Agreement
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {agreements.map((agreement) => {
            const config = statusConfig[agreement.status] || statusConfig.draft;
            const Icon = config.icon;
            
            return (
              <div
                key={agreement.id}
                className="group relative overflow-hidden rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-slate-300 sm:flex sm:items-center sm:justify-between"
              >
                {/* Status indicator line */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${config.color.split(' ')[0]} opacity-50`} />
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h4 className="font-bold text-slate-900 text-lg tracking-tight">
                      {agreement.custom_service_name || "Standard Service"}
                    </h4>
                    <Badge className={`${config.color} border-0 shadow-none font-bold rounded-lg px-2.5 py-0.5 flex items-center gap-1.5`}>
                      <Icon className="h-3.5 w-3.5" />
                      {config.label}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-medium">Base Rate</span>
                      <span className="font-bold text-slate-700">₱{Number(agreement.supplier_base_rate).toLocaleString()}</span>
                    </div>
                    <div className="h-1 w-1 rounded-full bg-slate-200 hidden sm:block" />
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-medium">Markup</span>
                      <span className="font-bold text-slate-700">₱{Number(agreement.venue_markup_fee).toLocaleString()}</span>
                    </div>
                    <div className="h-1 w-1 rounded-full bg-slate-200 hidden sm:block" />
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-medium">Total</span>
                      <span className="font-black text-blue-600">₱{(Number(agreement.supplier_base_rate) + Number(agreement.venue_markup_fee)).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 sm:mt-0">
                  <Button 
                    variant="outline" 
                    className="rounded-xl font-bold w-full sm:w-auto border-slate-200 text-slate-600 group-hover:bg-slate-50 transition-colors"
                    onClick={() => setSelectedAgreement(agreement)}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <ProposeAgreementModal
          supplierId={supplierId}
          venueId={venueId}
          venueName={venueName}
          supplierName={supplierName}
          supplierServices={supplierServices ?? []}
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
        />
      )}

      {selectedAgreement && (
        <ViewAgreementModal
          agreement={selectedAgreement}
          supplierName={supplierName}
          venueName={venueName}
          isOpen={!!selectedAgreement}
          onOpenChange={(open) => {
            if (!open) setSelectedAgreement(null);
          }}
        />
      )}
    </div>
  );
}
