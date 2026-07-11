"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Shield, X } from "lucide-react";
import { toast } from "sonner";
import { assignAdminTierAction } from "../application/actions";
import { ADMIN_TIERS, ADMIN_TIER_LABELS, type AdminTier } from "@/lib/rbac/permissions";

export function AssignTierDialog({
  userId,
  fullName,
  currentTier,
}: {
  userId: string;
  fullName: string;
  currentTier: AdminTier | null;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [tier, setTier] = useState<AdminTier>(currentTier ?? "support_admin");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await assignAdminTierAction({ userId, tier, reason: reason.trim() || undefined });
      if (result.error) {
        setError(result.error.message);
        return;
      }
      toast.success(`${fullName} is now ${ADMIN_TIER_LABELS[tier]}`);
      setIsOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#dbeafe] bg-[#eff6ff] px-2.5 text-xs font-bold text-[#1d4ed8] transition hover:bg-[#dbeafe]"
      >
        <Shield className="h-3.5 w-3.5" />
        Change tier
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="assign-tier-title">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => (isPending ? null : setIsOpen(false))}
          />

          <div className="relative w-full max-w-md rounded-[24px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <h2 id="assign-tier-title" className="text-lg font-black text-slate-900">
                Change administrator tier
              </h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={isPending}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <p className="text-sm text-slate-600">
                Assigning a new tier for <span className="font-bold text-slate-900">{fullName}</span>.
                This takes effect immediately and is recorded in the audit log.
              </p>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              ) : null}

              <div>
                <label htmlFor="admin-tier-select" className="mb-2 block text-sm font-bold text-slate-900">
                  Tier
                </label>
                <select
                  id="admin-tier-select"
                  value={tier}
                  onChange={(e) => setTier(e.target.value as AdminTier)}
                  disabled={isPending}
                  className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-sm focus:border-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-[#dbeafe]"
                >
                  {ADMIN_TIERS.map((t) => (
                    <option key={t} value={t}>
                      {ADMIN_TIER_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="admin-tier-reason" className="mb-2 block text-sm font-bold text-slate-900">
                  Reason <span className="font-normal text-slate-400">(optional, recommended)</span>
                </label>
                <textarea
                  id="admin-tier-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isPending}
                  rows={3}
                  maxLength={500}
                  placeholder="e.g. Promoted to finance operations lead"
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm focus:border-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-[#dbeafe]"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="rounded-full px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isPending || tier === currentTier}
                  className="flex items-center gap-2 rounded-full bg-[#1d4ed8] px-6 py-2 text-sm font-bold text-white transition hover:bg-[#1e40af] disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                  Confirm change
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
