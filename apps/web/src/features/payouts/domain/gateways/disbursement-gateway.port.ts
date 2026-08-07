/**
 * Disbursement port — the money-OUT provider boundary.
 *
 * Deliberately separate from PaymentGateway (money in). They are
 * different products with different credentials, different endpoints and
 * different enablement: PayMongo Checkout is v1, Treasury is v2, and a
 * merchant can have one without the other. Folding disbursement into the
 * payments port forced every payment gateway to implement a method it had
 * no business having.
 *
 * Nothing above this interface knows PayMongo's request format. The
 * adapter owns payload construction entirely.
 */

/** The rails PayMongo Treasury exposes. */
export type TransferNetwork = "instapay" | "pesonet";

/** Documented Transfer V2 status values. */
export type TransferStatus = "pending" | "succeeded" | "failed";

/**
 * A payout destination, already resolved to routing data. `institutionCode`
 * is a BIC obtained from the provider's own institution list — never a
 * user-typed bank name.
 */
export interface DisbursementDestination {
  accountNumber: string;
  accountName: string;
  institutionCode: string;
  institutionName: string | null;
}

export interface CreateTransferParams {
  /** Our withdrawal_requests id, sent as reference_number for correlation. */
  reference: string;
  /** Amount in minor units (centavos). */
  amountMinor: number;
  currency: string;
  network: TransferNetwork;
  destination: DisbursementDestination;
  description: string;
  metadata?: Record<string, string>;
}

export interface TransferResult {
  /** Provider transfer id (tr_...). */
  transferId: string;
  /** Provider batch id (btr_...) the transfer was created under. */
  batchTransferId: string | null;
  /** Provider-side reference, often null until the rail assigns one. */
  providerReferenceNumber: string | null;
  status: TransferStatus;
  network: TransferNetwork | string;
  /** Provider fee in minor units, when reported. */
  feeMinor: number | null;
}

export interface ReceivingInstitution {
  /** Sent verbatim as destination_account.bic. */
  code: string;
  name: string;
  network: TransferNetwork;
}

export interface DisbursementGateway {
  readonly id: "paymongo";

  /** True when the adapter is configured well enough to attempt a transfer. */
  isConfigured(): boolean;

  /** Creates one transfer. Throws PaymentError on any provider rejection. */
  createTransfer(params: CreateTransferParams): Promise<TransferResult>;

  /**
   * Authoritative status for a transfer.
   *
   * This — not the callback body — is what settlement decisions are based
   * on. The provider's callback payload is undocumented, so it is treated
   * purely as a hint that something changed.
   */
  getTransfer(transferId: string): Promise<TransferResult>;

  /** Institutions reachable on a rail, for the payout-account picker. */
  listReceivingInstitutions(
    network: TransferNetwork,
  ): Promise<ReceivingInstitution[]>;
}
