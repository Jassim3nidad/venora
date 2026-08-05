"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Banknote } from "lucide-react";
import { requestWithdrawalAction } from "../application/payout-actions";
import {
  PAYOUT_METHOD_LABELS,
  type Balance,
  type PayoutAccountRow,
} from "../types/payout.types";

const INPUT_CLASS =
  "rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10";

function formatPeso(value: number, currency: string) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export function WithdrawalRequestForm({
  balance,
  accounts,
  minimum,
  hasOpenWithdrawal,
}: {
  balance: Balance;
  accounts: PayoutAccountRow[];
  minimum: number;
  hasOpenWithdrawal: boolean;
}) {
  const router = useRouter();
  const verified = useMemo(
    () => accounts.filter((account) => account.verified_at),
    [accounts],
  );

  const [accountId, setAccountId] = useState(
    () => verified.find((a) => a.is_default)?.id ?? verified[0]?.id ?? "",
  );
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (hasOpenWithdrawal) {
    return (
      <p className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800">
        You have a withdrawal in progress. You can request another once it
        settles.
      </p>
    );
  }

  if (verified.length === 0) {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
        {accounts.length === 0
          ? "Add a payout account to withdraw your earnings."
          : "Your payout account is awaiting verification. We'll let you know once it's ready."}
      </p>
    );
  }

  if (balance.available < minimum) {
    return (
      <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
        You need at least {formatPeso(minimum, balance.currency)} available to
        withdraw. Current available balance:{" "}
        {formatPeso(balance.available, balance.currency)}.
      </p>
    );
  }

  if (success) {
    return (
      <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
        {success}
      </p>
    );
  }

  function submit() {
    setError(null);

    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (parsed < minimum) {
      setError(`Minimum withdrawal is ${formatPeso(minimum, balance.currency)}.`);
      return;
    }
    if (parsed > balance.available) {
      setError(
        `You can withdraw up to ${formatPeso(balance.available, balance.currency)}.`,
      );
      return;
    }

    // Generated once per submission attempt. If the request times out and
    // the user retries with the same key, request_withdrawal() returns the
    // original row rather than claiming a second set of payouts.
    const idempotencyKey = crypto.randomUUID();

    startTransition(async () => {
      const result = await requestWithdrawalAction({
        payoutAccountId: accountId,
        amount: parsed,
        idempotencyKey,
      });

      if (result.error) {
        setError(result.error.message);
        return;
      }

      setSuccess(
        "Withdrawal requested. We'll notify you once it has been reviewed and sent.",
      );
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4">
      <label className="grid gap-2 text-sm font-bold text-slate-700">
        Payout account
        <select
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
          className={INPUT_CLASS}
        >
          {verified.map((account) => (
            <option key={account.id} value={account.id}>
              {PAYOUT_METHOD_LABELS[account.method]}
              {account.bank_name ? ` — ${account.bank_name}` : ""} ••••
              {account.account_number_last4}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-2 text-sm font-bold text-slate-700">
        Amount
        <input
          type="number"
          inputMode="decimal"
          min={minimum}
          max={balance.available}
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder={String(minimum)}
          className={INPUT_CLASS}
        />
        <span className="text-xs font-medium text-slate-500">
          Available: {formatPeso(balance.available, balance.currency)} · Minimum:{" "}
          {formatPeso(minimum, balance.currency)}
        </span>
      </label>

      <button
        type="button"
        onClick={() => setAmount(String(balance.available))}
        className="justify-self-start text-xs font-bold uppercase tracking-wider text-[#2563EB] hover:underline"
      >
        Withdraw full balance
      </button>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={isPending || !accountId}
        onClick={submit}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Banknote className="h-4 w-4" />
        )}
        Request withdrawal
      </button>
    </div>
  );
}
