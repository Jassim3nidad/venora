/**
 * Hosts that are allow-listed for Next.js Image Optimization in `next.config.ts`.
 * Keep this in sync with the `images.remotePatterns` entries there.
 *
 * Venue media (storage_path) can sometimes contain arbitrary external URLs
 * (e.g. seeded/scraped venue photos hosted on the venue's own website) rather
 * than Supabase Storage paths. Those hosts are not, and cannot practically be,
 * allow-listed ahead of time, so `next/image` would throw a runtime error for
 * them. We detect that case here and fall back to `unoptimized` rendering
 * instead of optimizing through Next's image loader.
 */
const OPTIMIZABLE_HOST_PATTERNS: RegExp[] = [
  /(^|\.)supabase\.co$/,
  /^images\.unsplash\.com$/,
  /^lh3\.googleusercontent\.com$/,
];

export function isOptimizableImageSrc(src: string): boolean {
  // Local/relative paths are always served by Next.js itself.
  if (!src || src.startsWith("/")) return true;

  try {
    const { hostname } = new URL(src);
    return OPTIMIZABLE_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
  } catch {
    // Not a valid absolute URL — treat as non-optimizable to avoid crashing.
    return false;
  }
}
