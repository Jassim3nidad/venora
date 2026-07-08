import { formatCurrency } from "@venora/lib";

export function formatSupplierPrice(amount: number | null | undefined) {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    return "Quote on request";
  }

  return formatCurrency(amount);
}

export function formatPriceUnit(unit?: string | null) {
  const labels: Record<string, string> = {
    per_event: "per event",
    per_hour: "per hour",
    per_pax: "per pax",
    per_day: "per day",
  };

  return unit ? labels[unit] ?? unit.replace(/_/g, " ") : "";
}

export function formatRating(rating: number, count: number) {
  if (!count || rating <= 0) return "New supplier";
  return `${rating.toFixed(1)} (${count})`;
}

export function formatResponseTime(hours: number) {
  if (hours <= 1) return "Within 1 hour";
  if (hours < 24) return `Within ${hours} hours`;
  const days = Math.round(hours / 24);
  return `Within ${days} day${days === 1 ? "" : "s"}`;
}
