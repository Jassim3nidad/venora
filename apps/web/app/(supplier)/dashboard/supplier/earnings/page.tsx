import type { Metadata } from "next";
import { DashboardPage, EmptyState } from "@/components/dashboard/enterprise";
import { EarningsView } from "@/features/payouts/ui/EarningsView";
import { getEarningsOverview } from "@/features/payouts/application/queries";
import {
  MINIMUM_WITHDRAWAL,
  PAYOUT_HOLD_DAYS,
} from "@/features/payouts/payout-config";
import { getSupplierDashboardContext } from "../_lib/supplier-dashboard-data";

export const metadata: Metadata = { title: "Earnings - Supplier Dashboard" };
export const dynamic = "force-dynamic";

export default async function SupplierEarningsPage() {
  const { supabase, supplierProfile } = await getSupplierDashboardContext();

  if (!supplierProfile) {
    return (
      <DashboardPage className="flex flex-col gap-6">
        <Header />
        <EmptyState
          icon="account_balance_wallet"
          title="Profile setup pending"
          description="Create your supplier profile from the overview page to start earning."
        />
      </DashboardPage>
    );
  }

  const scope = { kind: "supplier" as const, supplierId: supplierProfile.id };
  const { balance, accounts, withdrawals, ledger } = await getEarningsOverview(
    supabase,
    scope,
  );

  return (
    <DashboardPage className="flex flex-col gap-6">
      <Header />
      <EarningsView
        balance={balance}
        accounts={accounts}
        withdrawals={withdrawals}
        ledger={ledger}
        scope="supplier"
        scopeId={supplierProfile.id}
        minimumWithdrawal={MINIMUM_WITHDRAWAL}
        holdDays={PAYOUT_HOLD_DAYS}
      />
    </DashboardPage>
  );
}

function Header() {
  return (
    <div className="mb-2 max-w-2xl">
      <h1 className="text-3xl font-black tracking-tight text-[#0f172a]">
        Earnings
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[#475569]">
        Track what you have earned from completed jobs and withdraw it to your
        bank account or e-wallet.
      </p>
    </div>
  );
}
