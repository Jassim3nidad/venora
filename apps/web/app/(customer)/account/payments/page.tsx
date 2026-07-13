import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreditCard, ShieldCheck, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import "@/src/features/payments/infrastructure/register-gateways";
import { listAvailableProviders } from "@/src/features/payments/application/gateway-registry";
import type { PaymentProviderId } from "@/src/features/payments/types/payment.types";

export const metadata: Metadata = {
  title: "Payments and Payouts",
};

export const dynamic = "force-dynamic";

const PROVIDER_DETAILS: Record<
  PaymentProviderId,
  { name: string; methods: string[]; note: string }
> = {
  paymongo: {
    name: "PayMongo",
    methods: ["Cards", "GCash", "Maya", "GrabPay"],
    note: "Methods are selected on PayMongo's hosted checkout page.",
  },
  maya: {
    name: "Maya",
    methods: ["Maya wallet", "Cards"],
    note: "Not enabled unless a Maya gateway is registered.",
  },
  stripe: {
    name: "Stripe",
    methods: ["Cards"],
    note: "Not enabled unless a Stripe gateway is registered.",
  },
};

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) {
    return "Pending";
  }

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Date pending";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Date pending";
  return date.toLocaleDateString("en-PH", { dateStyle: "medium" });
}

export default async function PaymentsPage() {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const providers = listAvailableProviders();
  const activeProviderDetails = providers.map((provider) => ({
    id: provider,
    ...PROVIDER_DETAILS[provider],
  }));

  const { data: payableBookings, error: payableError } = await supabase
    .from("bookings")
    .select("id, event_date, deposit_amount, status, venues(name)")
    .eq("customer_id", user.id)
    .in("status", ["approved", "payment_pending"])
    .order("event_date", { ascending: true })
    .limit(5);

  if (payableError) {
    console.error("[account/payments] Payable bookings fetch error:", payableError.message);
  }

  return (
    <div className="space-y-8">
      <div className="overflow-hidden rounded-[28px] border border-[#E5E7EB]/80 bg-white shadow-xl shadow-slate-200/60">
        <div className="border-b border-[#E5E7EB]/80 p-6 sm:p-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB] shadow-sm">
            <Wallet className="h-5 w-5" />
          </div>

          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
            Checkout options
          </p>

          <h1 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">
            Payment methods
          </h1>

          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
            Venora does not store saved cards or wallet credentials. Booking
            payments use secure hosted checkout from the enabled provider.
          </p>
        </div>

        <div className="grid gap-4 p-6 sm:p-8 md:grid-cols-2 xl:grid-cols-3">
          {activeProviderDetails.length > 0 ? (
            activeProviderDetails.map((provider) => (
              <div
                key={provider.id}
                className="rounded-3xl border border-slate-200 bg-[#F9FAFB] p-5"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#2563EB] shadow-sm">
                  <CreditCard className="h-5 w-5" />
                </div>
                <h2 className="text-sm font-extrabold text-slate-950">
                  {provider.name}
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {provider.methods.map((method) => (
                    <span
                      key={method}
                      className="rounded-full border border-[#DBEAFE] bg-white px-3 py-1 text-xs font-extrabold text-[#1D4ED8]"
                    >
                      {method}
                    </span>
                  ))}
                </div>
                <p className="mt-4 text-xs font-medium leading-5 text-slate-500">
                  {provider.note}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-6 md:col-span-2 xl:col-span-3">
              <p className="text-sm font-extrabold text-slate-800">
                No checkout provider enabled
              </p>
              <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                A payment provider secret must be configured before customers
                can start hosted checkout.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-[#E5E7EB]/80 bg-white shadow-xl shadow-slate-200/60">
        <div className="border-b border-[#E5E7EB]/80 p-6 sm:p-8">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
            Ready for checkout
          </p>
          <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-slate-950">
            Payable bookings
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
            Choose a booking to start or resume its secure deposit checkout.
          </p>
        </div>

        <div className="grid gap-3 p-6 sm:p-8">
          {payableError ? (
            <p className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
              Could not load payable bookings.
            </p>
          ) : (payableBookings ?? []).length > 0 ? (
            payableBookings.map((booking: any) => (
              <div
                key={booking.id}
                className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-[#F9FAFB] p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-extrabold text-slate-950">
                    {booking.venues?.name ?? "Venue booking"}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {formatDate(booking.event_date)} - Deposit{" "}
                    {formatCurrency(booking.deposit_amount)}
                  </p>
                </div>
                <Link
                  href={`/bookings/${booking.id}/payment`}
                  className="inline-flex h-11 w-fit items-center justify-center rounded-full bg-[#2563EB] px-5 text-sm font-extrabold text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1d4ed8]"
                >
                  Pay deposit
                </Link>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-6 py-10 text-center">
              <p className="text-sm font-extrabold text-slate-800">
                No payable bookings
              </p>
              <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                Approved bookings that require a deposit will appear here.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-[#E5E7EB]/80 bg-[#F9FAFB] p-5">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-[#2563EB] shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-800">
              No saved credential storage
            </h3>
            <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
              Venora never stores raw card numbers, CVVs, or wallet credentials.
              Payment details are entered only through the active provider.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
