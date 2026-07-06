import type { Metadata } from "next";
import { Clock, CreditCard, Plus, ShieldCheck, Wallet } from "lucide-react";

export const metadata: Metadata = {
  title: "Payments and Payouts",
};

const SUPPORTED_PROVIDERS = [
  { name: "PayMongo", note: "Cards, GCash, and e-wallets" },
  { name: "Maya", note: "Cards and Maya wallet" },
  { name: "Stripe", note: "International cards" },
];

export default function PaymentsPage() {
  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-[28px] border border-[#E5E7EB]/80 bg-white shadow-xl shadow-slate-200/60">
        <div className="border-b border-[#E5E7EB]/80 p-6 sm:p-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB] shadow-sm">
            <Wallet className="h-5 w-5" />
          </div>

          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
            Payments and payouts
          </p>

          <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">
            Payment methods
          </h1>

          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
            Saved payment methods aren&apos;t available yet. When this
            launches, you&apos;ll be able to store a card or e-wallet here to
            speed up booking checkout.
          </p>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-6 py-10 text-center sm:flex-row sm:justify-between sm:text-left">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-800">
                  No payment methods saved
                </p>
                <p className="mt-1 text-sm font-medium text-slate-500">
                  You&apos;ll be able to add a card or e-wallet here soon.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled
              aria-disabled="true"
              className="inline-flex w-fit shrink-0 cursor-not-allowed items-center gap-2 rounded-full bg-slate-200 px-5 py-2.5 text-sm font-extrabold text-slate-500"
            >
              <Plus className="h-4 w-4" />
              Add payment method
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-[#E5E7EB]/80 bg-white shadow-xl shadow-slate-200/60">
        <div className="border-b border-[#E5E7EB]/80 p-6 sm:p-8">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
            Coming soon
          </p>
          <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-slate-950">
            Supported payment providers
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
            Once saved payment methods launch, Venora will support these
            providers at checkout.
          </p>
        </div>

        <div className="grid gap-4 p-6 sm:p-8 md:grid-cols-3">
          {SUPPORTED_PROVIDERS.map((provider) => (
            <div
              key={provider.name}
              className="rounded-3xl border border-slate-200 bg-[#F9FAFB] p-5"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#2563EB] shadow-sm">
                <CreditCard className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-950">
                {provider.name}
              </h3>
              <p className="mt-1.5 text-xs font-medium leading-5 text-slate-500">
                {provider.note}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-400 shadow-sm">
                <Clock className="h-3 w-3" />
                Coming soon
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-[#E5E7EB]/80 bg-[#F9FAFB] p-5">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#2563EB] shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-800">
              Booking payments today
            </h3>
            <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
              You can still pay for bookings directly during checkout — this
              section only covers saving a payment method for future use. You
              can review completed and pending payments under{" "}
              <span className="font-bold text-slate-700">Transactions</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
