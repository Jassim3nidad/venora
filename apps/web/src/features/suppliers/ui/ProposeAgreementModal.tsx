"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogClose, Button, Input, Label } from "@venora/ui";
import { X, Loader2, Handshake, CircleDollarSign, Settings, Clock, Users, Building, ShieldCheck } from "lucide-react";
import { proposeCommercialAgreement } from "@/src/features/suppliers/application/commercial-agreement-actions";

type Props = {
  supplierId: string;
  venueId: string;
  venueName: string;
  supplierName: string;
  supplierServices?: { id: string; name: string; basePrice: number | null }[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProposeAgreementModal({
  supplierId,
  venueId,
  venueName,
  supplierName,
  supplierServices,
  isOpen,
  onOpenChange,
}: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serviceId, setServiceId] = useState<string>("custom");
  const [customServiceName, setCustomServiceName] = useState("");
  const [supplierBaseRate, setSupplierBaseRate] = useState<number | "">("");
  const [venueMarkupFee, setVenueMarkupFee] = useState<number | "">("");
  const [maxGuestCount, setMaxGuestCount] = useState<number | "">("");
  const [overtimeRate, setOvertimeRate] = useState<number | "">("");
  const [travelFees, setTravelFees] = useState<number | "">("");
  const [setupRequirements, setSetupRequirements] = useState("");
  const [cancellationTerms, setCancellationTerms] = useState("");
  const [reschedulingTerms, setReschedulingTerms] = useState("");

  const baseRate = Number(supplierBaseRate) || 0;
  const markupFee = Number(venueMarkupFee) || 0;
  const total = baseRate + markupFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (serviceId === "custom" && !customServiceName) {
      alert("Please provide a service name.");
      return;
    }
    if (baseRate <= 0) {
      alert("Supplier base rate must be greater than 0.");
      return;
    }

    setIsSubmitting(true);
    const payload: any = {
      venueId,
      supplierId,
      supplierBaseRate: baseRate,
      venueMarkupFee: markupFee,
      setupRequirements,
      cancellationTerms,
      reschedulingTerms,
    };

    if (serviceId !== "custom") payload.serviceId = serviceId;
    if (serviceId === "custom") payload.customServiceName = customServiceName;
    if (Number(maxGuestCount)) payload.maxGuestCount = Number(maxGuestCount);
    if (Number(overtimeRate)) payload.overtimeRate = Number(overtimeRate);
    if (Number(travelFees)) payload.travelFees = Number(travelFees);

    const result = await proposeCommercialAgreement(payload);

    setIsSubmitting(false);

    if (result.success) {
      alert("Commercial agreement proposed successfully!");
      onOpenChange(false);
    } else {
      alert(result.error || "Failed to propose agreement.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-slate-50 sm:rounded-[32px] [&>button]:hidden shadow-2xl border-0">
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="relative px-6 py-8 bg-white border-b border-slate-100 flex items-start justify-between">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-transparent pointer-events-none" />
            <div className="relative z-10 flex gap-4 items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100/50 border border-blue-200/50 shadow-sm text-blue-600">
                <Handshake className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">
                  Propose Agreement
                </DialogTitle>
                <p className="text-sm text-slate-500 font-medium mt-0.5">
                  Partner with <strong className="text-slate-700">{supplierName}</strong> for {venueName}
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
            {/* Core Details */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-200/50 text-slate-500">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Service Scope</h3>
              </div>
              
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm transition-shadow hover:shadow-md">
                <Label htmlFor="serviceSelection" className="text-slate-500 font-medium">Service Selection</Label>
                <select
                  id="serviceSelection"
                  className="mt-2 w-full h-12 px-4 bg-slate-50 border border-slate-200 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl font-medium"
                  value={serviceId}
                  onChange={(e) => {
                    setServiceId(e.target.value);
                    if (e.target.value !== "custom") {
                       const svc = supplierServices?.find(s => s.id === e.target.value);
                       if (svc && svc.basePrice) {
                          setSupplierBaseRate(svc.basePrice);
                       }
                    }
                  }}
                >
                  {supplierServices && supplierServices.length > 0 && (
                    <>
                      <option value="custom" disabled className="font-bold text-slate-400">
                        ── Existing Services ──
                      </option>
                      {supplierServices.map((svc) => (
                        <option key={svc.id} value={svc.id}>{svc.name}</option>
                      ))}
                      <option value="custom" disabled className="font-bold text-slate-400">
                        ── Custom Service ──
                      </option>
                    </>
                  )}
                  <option value="custom">Custom Service / Package Title</option>
                </select>

                {serviceId === "custom" && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <Label htmlFor="customServiceName" className="text-slate-500 font-medium">Custom Service Name</Label>
                    <Input
                      id="customServiceName"
                      className="mt-2 text-base h-12 bg-slate-50 border-slate-200 focus-visible:ring-blue-500 rounded-xl font-medium"
                      placeholder="e.g. Premium Catering & Setup"
                      value={customServiceName}
                      onChange={(e) => setCustomServiceName(e.target.value)}
                      required={serviceId === "custom"}
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Financial Terms */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-600">
                  <CircleDollarSign className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Financial Structure</h3>
              </div>

              <div className="bg-white p-1 rounded-[24px] shadow-sm border border-slate-200 relative overflow-hidden transition-shadow hover:shadow-md">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[80px] rounded-full pointer-events-none" />
                
                <div className="bg-white p-5 sm:p-6 rounded-[22px] relative z-10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="supplierBaseRate" className="text-slate-700 font-bold">Supplier Base Rate (₱)</Label>
                      <div className="relative mt-2">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">₱</span>
                        <Input
                          id="supplierBaseRate"
                          type="number"
                          min="0"
                          className="h-14 pl-9 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-emerald-500 rounded-xl text-lg font-bold"
                          placeholder="75000"
                          value={supplierBaseRate}
                          onChange={(e) => setSupplierBaseRate(Number(e.target.value) || "")}
                          required
                        />
                      </div>
                      <div className="text-xs text-slate-500 mt-2 font-medium flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Amount the supplier receives
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="venueMarkupFee" className="text-slate-700 font-bold">Venue Markup (₱)</Label>
                      <div className="relative mt-2">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">₱</span>
                        <Input
                          id="venueMarkupFee"
                          type="number"
                          min="0"
                          className="h-14 pl-9 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-emerald-500 rounded-xl text-lg font-bold"
                          placeholder="7500"
                          value={venueMarkupFee}
                          onChange={(e) => setVenueMarkupFee(Number(e.target.value) || "")}
                        />
                      </div>
                      <div className="text-xs text-slate-500 mt-2 font-medium flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Your coordination fee
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-700">Customer-Facing Total</p>
                      <p className="text-xs text-slate-500 mt-0.5 font-medium">What the client will pay</p>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-black text-slate-900 tracking-tight">₱{total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Additional Fees & Limits */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-600">
                  <Settings className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Capacity & Extra Fees</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-blue-200 transition-colors">
                  <div>
                    <div className="flex items-center gap-2 text-slate-500 mb-3">
                      <Clock className="h-4 w-4" />
                      <Label htmlFor="overtimeRate" className="font-medium text-xs uppercase tracking-wider">Overtime / hr</Label>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₱</span>
                      <Input
                        id="overtimeRate"
                        type="number"
                        min="0"
                        className="pl-7 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-900 group-hover:bg-white transition-colors"
                        placeholder="5000"
                        value={overtimeRate}
                        onChange={(e) => setOvertimeRate(Number(e.target.value) || "")}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-blue-200 transition-colors">
                  <div>
                    <div className="flex items-center gap-2 text-slate-500 mb-3">
                      <Building className="h-4 w-4" />
                      <Label htmlFor="travelFees" className="font-medium text-xs uppercase tracking-wider">Travel Fees</Label>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₱</span>
                      <Input
                        id="travelFees"
                        type="number"
                        min="0"
                        className="pl-7 bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-900 group-hover:bg-white transition-colors"
                        placeholder="2000"
                        value={travelFees}
                        onChange={(e) => setTravelFees(Number(e.target.value) || "")}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-blue-200 transition-colors">
                  <div>
                    <div className="flex items-center gap-2 text-slate-500 mb-3">
                      <Users className="h-4 w-4" />
                      <Label htmlFor="maxGuestCount" className="font-medium text-xs uppercase tracking-wider">Max Guests</Label>
                    </div>
                    <Input
                      id="maxGuestCount"
                      type="number"
                      min="1"
                      className="bg-slate-50 border-slate-200 rounded-xl font-bold text-slate-900 group-hover:bg-white transition-colors"
                      placeholder="e.g. 150"
                      value={maxGuestCount}
                      onChange={(e) => setMaxGuestCount(Number(e.target.value) || "")}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Terms & Conditions */}
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-100 text-purple-600">
                  <Handshake className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Operational Terms</h3>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-5">
                <div>
                  <Label htmlFor="setupRequirements" className="text-slate-700 font-bold">Setup Requirements</Label>
                  <textarea
                    id="setupRequirements"
                    className="mt-2 flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent transition-all"
                    placeholder="e.g. Requires access to venue 4 hours prior, needs 2 prep tables..."
                    value={setupRequirements}
                    onChange={(e) => setSetupRequirements(e.target.value)}
                    rows={2}
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                  <div>
                    <Label htmlFor="cancellationTerms" className="text-slate-700 font-bold">Cancellation Terms</Label>
                    <textarea
                      id="cancellationTerms"
                      className="mt-2 flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent transition-all"
                      placeholder="e.g. 50% non-refundable if within 30 days..."
                      value={cancellationTerms}
                      onChange={(e) => setCancellationTerms(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reschedulingTerms" className="text-slate-700 font-bold">Rescheduling Terms</Label>
                    <textarea
                      id="reschedulingTerms"
                      className="mt-2 flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-transparent transition-all"
                      placeholder="e.g. Allowed up to 60 days before event..."
                      value={reschedulingTerms}
                      onChange={(e) => setReschedulingTerms(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="px-6 py-5 border-t border-slate-200 bg-white flex justify-between items-center shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] relative z-10">
            <p className="text-xs text-slate-500 font-medium hidden sm:block">
              Please double check terms before proposing.
            </p>
            <div className="flex gap-3 w-full sm:w-auto">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="flex-1 sm:flex-none rounded-xl h-12 px-6 border-slate-200 font-bold text-slate-600 hover:bg-slate-50">
                  Cancel
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 sm:flex-none rounded-xl h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 shadow-md shadow-blue-500/20"
              >
                {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Send Proposal
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
