/**
 * Date and currency formatting utilities for Venora.
 * Uses the Intl API for locale-aware formatting.
 */

const PH_LOCALE = "en-PH";
const PH_CURRENCY = "PHP";

// ─── Date ────────────────────────────────────────────────────────────────────

export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(PH_LOCALE, {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString(PH_LOCALE, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString(PH_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelative(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

// ─── Currency ────────────────────────────────────────────────────────────────

export function formatCurrency(
  amount: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(PH_LOCALE, {
    style: "currency",
    currency: PH_CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  }).format(amount);
}

export function formatCurrencyCompact(amount: number): string {
  if (amount >= 1_000_000) {
    return `₱${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `₱${(amount / 1_000).toFixed(0)}K`;
  }
  return formatCurrency(amount);
}

// ─── Numbers ─────────────────────────────────────────────────────────────────

export function formatNumber(n: number): string {
  return new Intl.NumberFormat(PH_LOCALE).format(n);
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}
