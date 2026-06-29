/**
 * Converts a string into a URL-safe slug.
 *
 * Examples:
 *   slugify("The Grand Ballroom!")  → "the-grand-ballroom"
 *   slugify("Makati City (BGC)")    → "makati-city-bgc"
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9\s-]/g, "")   // strip non-alphanumeric
    .trim()
    .replace(/\s+/g, "-")            // spaces → hyphens
    .replace(/-+/g, "-");            // collapse multiple hyphens
}

/**
 * Extracts the human-readable name back from a slug.
 * (Best-effort — capitalises each word.)
 */
export function unslugify(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
