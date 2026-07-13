/**
 * Single source of truth for the site's absolute base URL, used by
 * metadataBase, robots.ts, sitemap.ts, and JSON-LD structured data.
 * NEXT_PUBLIC_APP_URL/NEXT_PUBLIC_SITE_URL take priority when set (and
 * must be a real deployed URL — a stale value here silently breaks
 * canonical URLs and Open Graph/Twitter previews sitewide), falling back
 * to Vercel's own per-deployment URL, then localhost for local dev.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`
    : null) ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  "http://localhost:3000";

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
