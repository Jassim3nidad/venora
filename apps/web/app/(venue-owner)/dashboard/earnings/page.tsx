import type { Metadata } from "next";
import { DashboardPage, EmptyState } from "@/components/dashboard/enterprise";
import { EarningsView } from "@/features/payouts/ui/EarningsView";
import { getEarningsOverview } from "@/features/payouts/application/queries";
import {
  MINIMUM_WITHDRAWAL,
  PAYOUT_HOLD_DAYS,
} from "@/features/payouts/payout-config";
import { getOwnerDashboardContext } from "../_lib/owner-dashboard-data";

export const metadata: Metadata = { title: "Earnings - Dashboard" };
export const dynamic = "force-dynamic";

export default async function OwnerEarningsPage() {
  const { supabase, orgIds } = await getOwnerDashboardContext();

  // Payouts are credited to the organization that owns the venue, so an
  // account with no organization has no balance to show. Coordinators are
  // organization_members too and reach this page with the same scope —
  // request_withdrawal() gates the money-out call on is_org_member, which
  // is the same check that produced these rows.
  const organizationId = orgIds[0];

  if (!organizationId) {
    return (
      <DashboardPage className="flex flex-col gap-6">
        <Header />
        <EmptyState
          icon="account_balance_wallet"
          title="No business account yet"
          description="Set up your business profile to start receiving payouts from completed bookings."
        />
      </DashboardPage>
    );
  }

  const scope = { kind: "organization" as const, organizationId };
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
        scope="organization"
        scopeId={organizationId}
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
        Your share of completed bookings, after platform commission and
        supplier costs, and the payouts you have withdrawn.
      </p>
    </div>
  );
}
