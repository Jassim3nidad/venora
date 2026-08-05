"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, ShieldCheck, Clock, Trash2 } from "lucide-react";
import {
  addPayoutAccountAction,
  archivePayoutAccountAction,
} from "../application/payout-actions";
import {
  PAYOUT_METHOD_LABELS,
  type PayoutAccountRow,
  type PayoutMethod,
} from "../types/payout.types";

const INPUT_CLASS =
  "rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10";

const METHODS: PayoutMethod[] = ["bank", "gcash", "paymaya"];

export function PayoutAccountManager({
  accounts,
  scope,
  scopeId,
}: {
  accounts: PayoutAccountRow[];
  scope: "organization" | "supplier";
  scopeId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(accounts.length === 0);
  const [method, setMethod] = useState<PayoutMethod>("bank");
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountIdentifier, setAccountIdentifier] = useState("");
  const [makeDefault, setMakeDefault] = useState(accounts.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);

    startTransition(async () => {
      const result = await addPayoutAccountAction({
        scope,
        scopeId,
        method,
        accountName,
        bankName: method === "bank" ? bankName : undefined,
        accountIdentifier,
        makeDefault,
      });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      // Cleared immediately — the full number should not linger in
      // component state after it has been sent for encryption.
      setAccountIdentifier("");
      setAccountName("");
      setBankName("");
      setOpen(false);
      router.refresh();
    });
  }

  function archive(id: string) {
    startTransition(async () => {
      const result = await archivePayoutAccountAction({ payoutAccountId: id });
      if (result.error) {
        setError(result.error.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4">
      {accounts.length > 0 ? (
        <ul className="grid gap-3">
          {accounts.map((account) => (
            <li
              key={account.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#0f172a]">
                  {PAYOUT_METHOD_LABELS[account.method]}
                  {account.bank_name ? ` — ${account.bank_name}` : ""} ••••
                  {account.account_number_last4}
                </p>
                <p className="mt-0.5 truncate text-xs font-medium text-[#64748b]">
                  {account.account_name}
                  {account.is_default ? " · Default" : ""}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {account.verified_at ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200/60">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200/60">
                    <Clock className="h-3.5 w-3.5" />
                    Pending verification
                  </span>
                )}

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => archive(account.id)}
                  aria-label="Remove payout account"
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}

      {open ? (
        <div className="grid gap-4 rounded-2xl border border-[#e5e7eb] p-4">
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Method
            <select
              value={method}
              onChange={(event) =>
                setMethod(event.target.value as PayoutMethod)
              }
              className={INPUT_CLASS}
            >
              {METHODS.map((value) => (
                <option key={value} value={value}>
                  {PAYOUT_METHOD_LABELS[value]}
                </option>
              ))}
            </select>
          </label>

          {method === "bank" ? (
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Bank
              <input
                value={bankName}
                onChange={(event) => setBankName(event.target.value)}
                maxLength={160}
                placeholder="BPI, BDO, UnionBank…"
                className={INPUT_CLASS}
              />
            </label>
          ) : null}

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Account holder name
            <input
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              maxLength={160}
              className={INPUT_CLASS}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            {method === "bank" ? "Account number" : "Mobile number"}
            <input
              value={accountIdentifier}
              onChange={(event) => setAccountIdentifier(event.target.value)}
              inputMode="numeric"
              autoComplete="off"
              maxLength={34}
              className={INPUT_CLASS}
            />
            <span className="text-xs font-medium text-slate-500">
              Encrypted before it is stored. Only the last 4 digits are ever
              shown back to you.
            </span>
          </label>

          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={makeDefault}
              onChange={(event) => setMakeDefault(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Use as my default payout account
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isPending}
              onClick={submit}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:opacity-60"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Save account
            </button>

            {accounts.length > 0 ? (
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-2xl px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center justify-center gap-2 self-start rounded-2xl border border-[#2563EB] px-5 py-3 text-sm font-bold text-[#2563EB] transition hover:bg-[#eff6ff]"
        >
          <Plus className="h-4 w-4" />
          Add payout account
        </button>
      )}
    </div>
  );
}
