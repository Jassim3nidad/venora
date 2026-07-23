import type { Metadata } from "next";
import { createClient } from "@/src/lib/supabase/server";
import { DashboardSubPage, Panel, PanelHeader } from "@/components/dashboard/enterprise";
import { CreditCard, DollarSign, RefreshCw, ShieldAlert, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Payment & Refund Monitoring - Administrator Workspace",
};

export default async function AdminPaymentsPage() {
  const supabase = await createClient();

  const [{ data: transactions }, { data: refunds }] = await Promise.all([
    supabase
      .from("transactions")
      .select(`
        id,
        amount,
        currency,
        payment_provider,
        provider_transaction_id,
        created_at,
        bookings (
          id,
          venues (name)
        )
      `)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("refund_requests")
      .select("id, amount, status, created_at")
      .limit(10),
  ]);

  const mayaEnabled = process.env.NEXT_PUBLIC_ENABLE_MAYA_PAYMENTS === "true";
  const totalVolume = (transactions || []).reduce((acc: number, t: any) => acc + (Number(t.amount) || 0), 0);

  return (
    <DashboardSubPage
      title="Payment & Refund Operations"
      description="Monitor PayMongo/Maya transaction flows, refund requests, and gateway webhook status."
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Logged Volume</p>
            <p className="text-lg font-bold text-slate-900">₱{totalVolume.toLocaleString()}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Active Gateway</p>
            <p className="text-sm font-bold text-slate-900">PayMongo (Active)</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Maya Gateway</p>
            <p className="text-sm font-bold text-slate-900">
              {mayaEnabled ? "Enabled" : "Disabled (Safe Mode)"}
            </p>
          </div>
        </div>
      </div>

      <Panel>
        <PanelHeader
          title="Recent Platform Transactions"
          description="Live payment log from booking deposits and full settlements."
        />
        {(!transactions || transactions.length === 0) ? (
          <div className="py-12 text-center text-slate-500">
            <CreditCard className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-sm text-slate-700">No payment transactions recorded yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {transactions.map((t: any) => (
              <div key={t.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-slate-900">
                    ₱{Number(t.amount).toLocaleString()} {t.currency}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t.bookings?.venues?.name || "Booking"} • Provider: {t.payment_provider}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    Success
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(t.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </DashboardSubPage>
  );
}
