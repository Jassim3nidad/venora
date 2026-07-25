"use client";

import { useState } from "react";
import { MaterialIcon, Panel } from "@/src/components/dashboard/enterprise";
import { endPartnershipAction } from "../application/active-partnership.actions";
import { Dialog, DialogContent, DialogTitle, DialogClose, Badge, Button } from "@venora/ui";
import { X, Handshake, CircleDollarSign, Settings, FileText, Clock, XCircle, AlertCircle, Building, Users, Trash2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PartnershipConversation } from "@/src/features/venues/ui/PartnershipConversation";
import { type PartnershipMessage } from "@/src/features/venues/application/partnership-messages-actions";

export function ActivePartnershipCard({ 
  partnership, 
  agreement,
  messages,
  currentUserId,
  currentUserName,
  counterpartRole,
}: { 
  partnership: any;
  agreement?: any;
  messages?: PartnershipMessage[];
  currentUserId?: string;
  currentUserName?: string;
  counterpartRole?: string;
}) {
  const router = useRouter();
  const [isEnding, setIsEnding] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  
  const venue = partnership.venues;

  async function handleEndPartnership() {
    setIsEnding(true);
    try {
      await endPartnershipAction(partnership.id);
      toast.success(`Partnership with ${venue.name} ended.`);
      setShowEndModal(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to end partnership.");
    } finally {
      setIsEnding(false);
    }
  }

  return (
    <>
      <Panel className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eff6ff] text-[#1d4ed8]">
            <MaterialIcon name="business" />
          </div>
          
          <div className="flex items-center gap-2">
            {partnership.is_preferred ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                <MaterialIcon name="star" className="text-xs" filled />
                Preferred
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                <MaterialIcon name="handshake" className="text-xs" />
                Partner
              </span>
            )}
          </div>
        </div>
        
        <div className="mt-1">
          <p className="font-display text-lg font-bold text-[#111827]">
            {venue?.name || "Unknown Venue"}
          </p>
          <p className="text-sm font-medium text-[#6b7280]">
            {[venue?.city, venue?.province].filter(Boolean).join(", ") || "Location unlisted"}
          </p>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-3">
          <Button 
            variant="outline" 
            className="w-full text-slate-600 hover:text-blue-600 shadow-sm"
            onClick={() => setShowChatModal(true)}
          >
            Message
          </Button>
          <Button 
            variant="outline" 
            className="w-full text-slate-600 hover:text-slate-900 shadow-sm"
            onClick={() => setShowTermsModal(true)}
            disabled={!agreement}
          >
            Terms
          </Button>
          <Button 
            variant="outline" 
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200 shadow-sm transition-colors"
            onClick={() => setShowEndModal(true)}
          >
            End
          </Button>
        </div>
      </Panel>

      {/* View Terms Modal */}
      {agreement && (
        <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-0">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/80 px-6 py-4 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Handshake className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-900">Active Partnership Terms</DialogTitle>
                  <p className="text-sm font-medium text-slate-500">
                    Agreement with {venue?.name}
                  </p>
                </div>
              </div>
              <DialogClose className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </DialogClose>
            </div>

            <div className="px-6 py-6 space-y-8">
              {/* Financial Breakdown */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <CircleDollarSign className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-900">Financial Arrangement</h3>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-medium text-slate-500 mb-1">Your Payout</p>
                    <p className="font-display text-2xl font-bold text-slate-900">
                      ₱{(agreement.supplier_base_rate ?? 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Base rate per booking</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-medium text-slate-500 mb-1">Total Customer Price</p>
                    <div className="flex justify-between items-center w-full sm:w-auto sm:min-w-[240px]">
                      <p className="font-display text-2xl font-bold text-blue-600">
                        ₱{(agreement.total ?? 0).toLocaleString()}
                      </p>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wide">
                        + ₱{(agreement.venue_markup_fee ?? 0).toLocaleString()} Venue Markup
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  {agreement.overtime_rate && (
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                      <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
                        <Clock className="h-4 w-4" /> Overtime Rate
                      </span>
                      <span className="font-bold text-slate-900">₱{agreement.overtime_rate.toLocaleString()} /hr</span>
                    </div>
                  )}
                  {agreement.travel_fee_policy && (
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                      <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
                        <Building className="h-4 w-4" /> Travel Fee
                      </span>
                      <span className="font-bold text-slate-900 capitalize">{agreement.travel_fee_policy.replace(/_/g, ' ')}</span>
                    </div>
                  )}
                </div>
              </section>

              {/* Operational Rules */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-blue-600" />
                  <h3 className="font-bold text-slate-900">Operational Rules</h3>
                </div>
                
                <div className="grid gap-3">
                  <div className="flex items-start gap-3 rounded-xl border border-slate-100 p-4 shadow-sm">
                    <Users className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                    <div>
                      <p className="text-sm font-bold text-slate-900">Maximum Guests</p>
                      <p className="text-sm text-slate-600">
                        {agreement.max_guests ? `Up to ${agreement.max_guests} guests allowed` : "No specific limit set"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 rounded-xl border border-slate-100 p-4 shadow-sm">
                    <Clock className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                    <div>
                      <p className="text-sm font-bold text-slate-900">Minimum Lead Time</p>
                      <p className="text-sm text-slate-600">
                        {agreement.minimum_lead_time_days ? `${agreement.minimum_lead_time_days} days notice required` : "No specific lead time set"}
                      </p>
                    </div>
                  </div>
                  
                  {agreement.setup_requirements && (
                    <div className="flex items-start gap-3 rounded-xl border border-slate-100 p-4 shadow-sm">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                      <div>
                        <p className="text-sm font-bold text-slate-900">Setup Requirements</p>
                        <p className="text-sm text-slate-600">{agreement.setup_requirements}</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Legal & Cancellation */}
              <section className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-slate-600" />
                  <h3 className="font-bold text-slate-900">Policies</h3>
                </div>
                
                <div className="grid gap-4 md:grid-cols-2">
                  {agreement.cancellation_policy && (
                    <div className="rounded-xl border border-slate-100 p-4">
                      <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mb-2">
                        <XCircle className="h-4 w-4 text-red-500" /> Cancellation Policy
                      </p>
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{agreement.cancellation_policy}</p>
                    </div>
                  )}
                  {agreement.rescheduling_policy && (
                    <div className="rounded-xl border border-slate-100 p-4">
                      <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mb-2">
                        <Clock className="h-4 w-4 text-amber-500" /> Rescheduling Policy
                      </p>
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{agreement.rescheduling_policy}</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
            
            <div className="border-t border-slate-100 bg-slate-50 p-6 flex justify-end">
              <button 
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition"
              >
                Close
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* End Partnership Modal */}
      <Dialog open={showEndModal} onOpenChange={setShowEndModal}>
        <DialogContent className="max-w-md">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900 mb-2">End Partnership?</DialogTitle>
            <div className="text-sm text-slate-600 mb-6 text-left bg-red-50 p-4 rounded-xl border border-red-100">
              <p className="font-medium text-red-900 mb-2">
                Are you sure you want to end your partnership with <strong>{venue?.name}</strong>?
              </p>
              <ul className="list-disc pl-5 space-y-1 text-red-800/90 mb-3">
                <li>You will be removed from this venue's partner list.</li>
                <li>Your services will no longer be bookable through this venue.</li>
                <li>Any active or pending inquiries may be affected.</li>
              </ul>
              <p className="text-red-900/80 text-xs italic font-medium">This action cannot be undone.</p>
            </div>
            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                disabled={isEnding}
                onClick={() => setShowEndModal(false)}
                className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isEnding}
                onClick={handleEndPartnership}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-red-700 transition disabled:opacity-50"
              >
                {isEnding ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                    <span>Ending...</span>
                  </>
                ) : (
                  <span>End Partnership</span>
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Modal */}
      <Dialog open={showChatModal} onOpenChange={setShowChatModal}>
        <DialogContent className="max-w-xl p-0 overflow-hidden bg-transparent border-0 shadow-none [&>button]:hidden">
          <div className="relative">
            {currentUserId && currentUserName ? (
              <PartnershipConversation
                venueOrgId={venue?.organization_id}
                supplierId={partnership.supplier_id}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                initialMessages={messages ?? []}
                counterpartLabel={venue?.name ?? "Venue"}
                counterpartRole={counterpartRole ?? "Venue"}
                revalidatePath="/dashboard/supplier/partnerships"
              />
            ) : (
              <div className="bg-white p-6 rounded-2xl text-center shadow-sm">Loading chat...</div>
            )}
            
            {/* Custom Close Button for the chat modal so it doesn't overlap the conversation header */}
            <button
              onClick={() => setShowChatModal(false)}
              className="absolute right-4 top-4 rounded-xl p-2 text-slate-500 hover:bg-white/50 hover:text-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}