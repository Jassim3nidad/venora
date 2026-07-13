import type {
  SupplierAvailabilityStatus,
  SupplierQuoteStatus,
} from "../types/supplier-dashboard.types";

export function calculateSupplierQuoteTotals(
  items: Array<{ quantity: number; unitPrice: number }>,
  additionalFees = 0,
) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );

  return {
    subtotal,
    additionalFees,
    total: subtotal + additionalFees,
  };
}

export function canSupplierTransitionQuote(
  from: SupplierQuoteStatus,
  to: SupplierQuoteStatus,
) {
  return (
    (from === "draft" && to === "sent") ||
    (from === "sent" && to === "withdrawn")
  );
}

export function isSupplierDateUnavailable(
  manualStatus: SupplierAvailabilityStatus | null,
  hasConfirmedJob: boolean,
) {
  return (
    hasConfirmedJob ||
    manualStatus === "blocked" ||
    manualStatus === "unavailable"
  );
}
