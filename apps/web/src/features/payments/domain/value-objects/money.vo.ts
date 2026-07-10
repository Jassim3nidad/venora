/**
 * Money value object.
 *
 * The database stores amounts as numeric(12,2) in major units (PHP pesos).
 * Payment providers (PayMongo, Stripe) bill in minor units (centavos).
 * All conversions must go through this module so rounding is consistent.
 */

export const DEFAULT_CURRENCY = "PHP" as const;

/** Convert a major-unit amount (e.g. 1500.50 PHP) to minor units (150050 centavos). */
export function toMinorUnits(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new RangeError(`Invalid monetary amount: ${amount}`);
  }
  return Math.round(amount * 100);
}

/** Convert minor units (centavos) back to a major-unit amount. */
export function fromMinorUnits(minor: number): number {
  if (!Number.isFinite(minor) || minor < 0) {
    throw new RangeError(`Invalid minor-unit amount: ${minor}`);
  }
  return Math.round(minor) / 100;
}

export function formatMoney(amount: number, currency: string = DEFAULT_CURRENCY): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}
