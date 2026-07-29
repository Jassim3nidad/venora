import { describe, expect, it } from "vitest";
import { evaluatePaymentReconciliation } from "./payment-reconciliation";

describe("evaluatePaymentReconciliation", () => {
  it("marks a paid Venora transaction as matched when provider amount, currency, and reference agree", () => {
    expect(
      evaluatePaymentReconciliation({
        transactionStatus: "paid",
        transactionAmount: 80000,
        transactionCurrency: "PHP",
        providerAmount: 80000,
        providerCurrency: "PHP",
        providerStatus: "paid",
        hasProviderReference: true,
      }),
    ).toMatchObject({
      status: "matched",
      severity: "informational",
      shouldAlert: false,
    });
  });

  it("flags a critical amount mismatch before an admin marks the transaction reconciled", () => {
    expect(
      evaluatePaymentReconciliation({
        transactionStatus: "paid",
        transactionAmount: 80000,
        transactionCurrency: "PHP",
        providerAmount: 75000,
        providerCurrency: "PHP",
        providerStatus: "paid",
        hasProviderReference: true,
      }),
    ).toMatchObject({
      status: "amount_mismatch",
      severity: "critical",
      shouldAlert: true,
    });
  });

  it("flags paid transactions that have no provider reference for manual review", () => {
    expect(
      evaluatePaymentReconciliation({
        transactionStatus: "paid",
        transactionAmount: 80000,
        transactionCurrency: "PHP",
        providerStatus: "paid",
        hasProviderReference: false,
      }),
    ).toMatchObject({
      status: "missing_provider_reference",
      severity: "high",
      shouldAlert: true,
    });
  });
});
