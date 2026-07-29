export type PaymentReconciliationStatus =
  | "matched"
  | "pending_provider_confirmation"
  | "missing_provider_reference"
  | "missing_provider_transaction"
  | "amount_mismatch"
  | "currency_mismatch"
  | "status_mismatch"
  | "requires_manual_review";

export type PaymentAlertSeverity =
  | "informational"
  | "warning"
  | "high"
  | "critical";

export type PaymentReconciliationInput = {
  transactionStatus: string;
  transactionAmount: number;
  transactionCurrency: string;
  providerAmount?: number | null;
  providerCurrency?: string | null;
  providerStatus?: string | null;
  hasProviderReference: boolean;
};

export type PaymentReconciliationResult = {
  status: PaymentReconciliationStatus;
  severity: PaymentAlertSeverity;
  title: string;
  description: string;
  shouldAlert: boolean;
};

function normalizeCurrency(value: string | null | undefined) {
  return (value ?? "PHP").trim().toUpperCase();
}

function normalizeStatus(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function evaluatePaymentReconciliation(
  input: PaymentReconciliationInput,
): PaymentReconciliationResult {
  const venoraStatus = normalizeStatus(input.transactionStatus);
  const providerStatus = normalizeStatus(input.providerStatus);
  const venoraCurrency = normalizeCurrency(input.transactionCurrency);
  const providerCurrency = input.providerCurrency
    ? normalizeCurrency(input.providerCurrency)
    : null;

  if (!input.hasProviderReference && venoraStatus === "paid") {
    return {
      status: "missing_provider_reference",
      severity: "high",
      title: "Paid transaction has no provider reference",
      description:
        "Venora marks this transaction paid, but no payment gateway reference is stored.",
      shouldAlert: true,
    };
  }

  if (input.hasProviderReference && providerStatus === "") {
    return {
      status: "missing_provider_transaction",
      severity: "high",
      title: "Provider transaction not confirmed",
      description:
        "A provider reference exists, but no provider status was available for reconciliation.",
      shouldAlert: true,
    };
  }

  if (providerCurrency && providerCurrency !== venoraCurrency) {
    return {
      status: "currency_mismatch",
      severity: "critical",
      title: "Payment currency mismatch",
      description: `Venora recorded ${venoraCurrency}, but the provider reported ${providerCurrency}.`,
      shouldAlert: true,
    };
  }

  if (
    input.providerAmount != null &&
    Number(input.providerAmount) !== Number(input.transactionAmount)
  ) {
    return {
      status: "amount_mismatch",
      severity: "critical",
      title: "Payment amount mismatch",
      description:
        "The amount recorded by Venora does not match the amount reported by the provider.",
      shouldAlert: true,
    };
  }

  if (
    venoraStatus === "paid" &&
    providerStatus &&
    !["paid", "succeeded", "chargeable", "processed"].includes(providerStatus)
  ) {
    return {
      status: "status_mismatch",
      severity: "critical",
      title: "Payment status mismatch",
      description: `Venora marks this transaction paid, but the provider status is ${providerStatus}.`,
      shouldAlert: true,
    };
  }

  if (venoraStatus === "pending") {
    return {
      status: "pending_provider_confirmation",
      severity: "warning",
      title: "Payment is still pending",
      description:
        "This transaction is awaiting provider confirmation or customer payment completion.",
      shouldAlert: false,
    };
  }

  if (venoraStatus === "paid") {
    return {
      status: "matched",
      severity: "informational",
      title: "Payment reconciled",
      description:
        "Venora and provider payment details agree for this transaction.",
      shouldAlert: false,
    };
  }

  return {
    status: "requires_manual_review",
    severity: "warning",
    title: "Payment requires manual review",
    description:
      "The current payment state does not need an urgent alert, but should be reviewed by finance operations.",
    shouldAlert: false,
  };
}
