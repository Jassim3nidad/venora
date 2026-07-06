"use client";

import { useState } from "react";
import { Eye, Check, X, FileText, Loader2, MapPin } from "lucide-react";
import { approveApplicationAction, denyApplicationAction } from "../actions/admin.actions";

export function ApplicationReviewModal({ application }: { application: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isDenying, setIsDenying] = useState(false);
  const [denialReason, setDenialReason] = useState("");
  const [showDenyInput, setShowDenyInput] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const docs = application.documents_json ? JSON.parse(application.documents_json) : [];

  const handleApprove = async () => {
    setIsApproving(true);
    setError(null);
    const res = await approveApplicationAction(application.id);
    if (!res.success) {
      setError(res.error || "Failed to approve application");
    } else {
      setIsOpen(false);
    }
    setIsApproving(false);
  };

  const handleDeny = async () => {
    if (!denialReason.trim()) {
      setError("Please provide a reason for denial.");
      return;
    }
    setIsDenying(true);
    setError(null);
    const res = await denyApplicationAction(application.id, denialReason);
    if (!res.success) {
      setError(res.error || "Failed to deny application");
    } else {
      setIsOpen(false);
    }
    setIsDenying(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
      >
        <Eye className="h-3.5 w-3.5" />
        Review
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[24px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <h2 className="text-xl font-black text-slate-900">Application Review</h2>
              <button onClick={() => setIsOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              {error && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              <div className="grid gap-6 sm:grid-cols-2 mb-8">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Applicant</p>
                  <p className="font-bold text-slate-900">{application.profiles?.full_name}</p>
                  <p className="text-sm text-slate-600">{application.profiles?.email}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Role & Category</p>
                  <p className="font-bold text-slate-900">{application.role_applied_for.replace("_", " ").toUpperCase()}</p>
                  <p className="text-sm text-slate-600">{application.category}</p>
                </div>
              </div>

              <div className="mb-8 rounded-2xl bg-slate-50 p-5 border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <h3 className="font-bold text-slate-900">Business Address</h3>
                </div>
                <p className="text-sm text-slate-700">
                  {application.address_unit ? `${application.address_unit}, ` : ""}
                  {application.address_building ? `${application.address_building}, ` : ""}
                  {application.address_street}<br/>
                  {application.address_district}, {application.address_city}<br/>
                  {application.address_country} {application.address_zip}
                </p>
              </div>

              <div className="mb-8">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Verification Documents</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {docs.map((docUrl: string, idx: number) => (
                    <a
                      key={idx}
                      href={docUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-[#2563EB] hover:bg-[#EFF6FF]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">Document {idx + 1}</p>
                        <p className="text-xs text-slate-500">Click to view</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              {showDenyInput ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                  <label className="mb-2 block text-sm font-bold text-red-900">Reason for Denial</label>
                  <textarea
                    value={denialReason}
                    onChange={(e) => setDenialReason(e.target.value)}
                    className="w-full rounded-xl border-red-300 bg-white p-3 text-sm focus:border-red-500 focus:ring-red-500"
                    rows={3}
                    placeholder="Explain why this application is denied..."
                  />
                  <div className="mt-4 flex justify-end gap-3">
                    <button
                      onClick={() => setShowDenyInput(false)}
                      className="rounded-full px-4 py-2 text-sm font-bold text-slate-600 hover:bg-red-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeny}
                      disabled={isDenying}
                      className="flex items-center gap-2 rounded-full bg-red-600 px-6 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {isDenying ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                      Confirm Denial
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end border-t border-slate-100 pt-6">
                  <button
                    onClick={() => setShowDenyInput(true)}
                    className="rounded-full px-6 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50"
                  >
                    Deny Application
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={isApproving}
                    className="flex items-center justify-center gap-2 rounded-full bg-[#2563EB] px-8 py-2.5 text-sm font-bold text-white transition hover:bg-[#1D4ED8] disabled:opacity-50"
                  >
                    {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Approve & Upgrade Role
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
