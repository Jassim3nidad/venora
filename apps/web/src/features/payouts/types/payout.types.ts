import type { PaymentProviderId } from "@/features/payments/types/payment.types";

/**
 * Payout and withdrawal types mirroring the schema added in
 * 20260805130000..20260805133000.
 */

export type PayoutStatus = "scheduled" | "processing" | "paid" | "failed";

export type PayoutMethod = "bank" | "gcash" | "paymaya";

/** Treasury rails a payout account can be reached on. */
export type TransferNetwork = "instapay" | "pesonet";

export type WithdrawalStatus =
  | "pending"
  | "approved"
  | "processing"
  | "paid"
  | "failed"
  | "rejected"
  | "cancelled";

/** Which side of the marketplace a balance belongs to. */
export type PayoutScope =
  | { kind: "organization"; organizationId: string }
  | { kind: "supplier"; supplierId: string };

export interface Balance {
  /** Past the hold period and unclaimed — withdrawable right now. */
  available: number;
  /** Earned but still inside the refund/dispute hold window. */
  pending: number;
  /** Claimed by a withdrawal that has not settled yet. */
  inTransit: number;
  currency: string;
}

/**
 * The client-visible shape of a payout account. Deliberately has no
 * ciphertext field: `authenticated` holds no SELECT grant on that column,
 * so it can never be selected into this type.
 */
export interface PayoutAccountRow {
  id: string;
  organization_id: string | null;
  supplier_id: string | null;
  method: PayoutMethod;
  account_name: string;
  bank_name: string | null;
  institution_code: string | null;
  institution_name: string | null;
  network: TransferNetwork | null;
  account_type: string | null;
  account_number_last4: string;
  is_default: boolean;
  verified_at: string | null;
  archived_at: string | null;
  created_at: string;
}

export interface WithdrawalRequestRow {
  id: string;
  organization_id: string | null;
  supplier_id: string | null;
  payout_account_id: string;
  amount: number;
  currency: string;
  status: WithdrawalStatus;
  requested_at: string;
  reviewed_at: string | null;
  review_note: string | null;
  payment_provider: PaymentProviderId | null;
  provider_reference: string | null;
  failure_reason: string | null;
  processed_at: string | null;
}

export interface PayoutLedgerRow {
  id: string;
  booking_id: string | null;
  amount: number;
  currency: string;
  status: PayoutStatus;
  scheduled_at: string | null;
  paid_at: string | null;
  withdrawal_request_id: string | null;
}

export const WITHDRAWAL_STATUS_LABELS: Record<WithdrawalStatus, string> = {
  pending: "Awaiting review",
  approved: "Approved",
  processing: "Sending",
  paid: "Paid",
  failed: "Failed",
  rejected: "Declined",
  cancelled: "Cancelled",
};

export const PAYOUT_METHOD_LABELS: Record<PayoutMethod, string> = {
  bank: "Bank account",
  gcash: "GCash",
  paymaya: "Maya",
};
