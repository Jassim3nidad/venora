import type {
  Balance,
  PayoutAccountRow,
  PayoutLedgerRow,
  PayoutScope,
  WithdrawalRequestRow,
} from "../types/payout.types";

/**
 * Read-side queries for the earnings pages.
 *
 * Every one of these runs against the caller's own session client, so RLS
 * (`payouts.select.*`, `payout_accounts.select.owner`,
 * `withdrawal_requests.select.owner`) is what scopes the rows — the scope
 * filters below are for correctness of the query, not for authorization.
 */

// Supabase's generated relationship types are incomplete in this app; the
// dashboard queries stay narrow and runtime-shaped, matching the pattern
// in org-dashboard-data.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any;

const EMPTY_BALANCE: Balance = {
  available: 0,
  pending: 0,
  inTransit: 0,
  currency: "PHP",
};

function scopeColumn(scope: PayoutScope) {
  return scope.kind === "organization" ? "organization_id" : "supplier_id";
}

function scopeId(scope: PayoutScope) {
  return scope.kind === "organization"
    ? scope.organizationId
    : scope.supplierId;
}

export async function getBalance(
  supabase: Client,
  scope: PayoutScope,
): Promise<Balance> {
  const { data, error } = await supabase.rpc("get_available_balance", {
    p_organization_id:
      scope.kind === "organization" ? scope.organizationId : null,
    p_supplier_id: scope.kind === "supplier" ? scope.supplierId : null,
  });

  if (error) {
    console.error("[payouts] get_available_balance failed:", error.message);
    return EMPTY_BALANCE;
  }

  // The RPC returns TABLE(...), so PostgREST hands back an array.
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return EMPTY_BALANCE;

  return {
    available: Number(row.available ?? 0),
    pending: Number(row.pending ?? 0),
    inTransit: Number(row.in_transit ?? 0),
    currency: row.currency ?? "PHP",
  };
}

export async function listPayoutAccounts(
  supabase: Client,
  scope: PayoutScope,
): Promise<PayoutAccountRow[]> {
  const { data, error } = await supabase
    .from("payout_accounts")
    // No ciphertext column — `authenticated` has no SELECT grant on it,
    // so requesting it would fail the whole query.
    .select(
      "id, organization_id, supplier_id, method, account_name, bank_name, " +
        "institution_code, institution_name, network, account_type, " +
        "account_number_last4, is_default, verified_at, archived_at, created_at",
    )
    .eq(scopeColumn(scope), scopeId(scope))
    .is("archived_at", null)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[payouts] listPayoutAccounts failed:", error.message);
    return [];
  }

  return (data ?? []) as PayoutAccountRow[];
}

export async function listWithdrawals(
  supabase: Client,
  scope: PayoutScope,
  limit = 20,
): Promise<WithdrawalRequestRow[]> {
  const { data, error } = await supabase
    .from("withdrawal_requests")
    .select(
      "id, organization_id, supplier_id, payout_account_id, amount, currency, " +
        "status, requested_at, reviewed_at, review_note, payment_provider, " +
        "provider_reference, failure_reason, processed_at",
    )
    .eq(scopeColumn(scope), scopeId(scope))
    .order("requested_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[payouts] listWithdrawals failed:", error.message);
    return [];
  }

  return (data ?? []) as WithdrawalRequestRow[];
}

export async function listPayoutLedger(
  supabase: Client,
  scope: PayoutScope,
  limit = 25,
): Promise<PayoutLedgerRow[]> {
  const { data, error } = await supabase
    .from("payouts")
    .select(
      "id, booking_id, amount, currency, status, scheduled_at, paid_at, withdrawal_request_id",
    )
    .eq(scopeColumn(scope), scopeId(scope))
    .order("scheduled_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error("[payouts] listPayoutLedger failed:", error.message);
    return [];
  }

  return (data ?? []) as PayoutLedgerRow[];
}

/**
 * Everything the earnings page renders, in one round trip.
 */
export async function getEarningsOverview(
  supabase: Client,
  scope: PayoutScope,
) {
  const [balance, accounts, withdrawals, ledger] = await Promise.all([
    getBalance(supabase, scope),
    listPayoutAccounts(supabase, scope),
    listWithdrawals(supabase, scope),
    listPayoutLedger(supabase, scope),
  ]);

  return { balance, accounts, withdrawals, ledger };
}
