/** Shared text-normalization helpers for Edge Functions (ai-search, ai-assistant). */

const DIACRITIC_RANGE_START = 0x0300;
const DIACRITIC_RANGE_END = 0x036f;
const COMBINING_DIACRITICS = new RegExp(
  "[" + String.fromCharCode(DIACRITIC_RANGE_START) + "-" + String.fromCharCode(DIACRITIC_RANGE_END) + "]",
  "g",
);

export function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(COMBINING_DIACRITICS, "")
    .trim()
    .toLowerCase();
}

export function cleanString(value: unknown, maxLength = 120): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

const venueRelatedKeywords = [
  "venue", "venues", "wedding", "reception", "garden", "beach", "resort",
  "hotel", "restaurant", "church", "budget", "price", "guest", "guests",
  "capacity", "book", "booking", "package", "packages", "available",
  "availability", "location", "city", "province", "indoor", "outdoor",
  "parking", "pool", "accessible",
];

/** Cheap heuristic — does this message look like it's asking about venues? */
export function looksVenueRelated(message: string): boolean {
  const normalized = normalizeText(message);
  return venueRelatedKeywords.some((keyword) => normalized.includes(keyword));
}
