import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import withBundleAnalyzerInit from "@next/bundle-analyzer";

const configDir = path.dirname(fileURLToPath(import.meta.url));

const withBundleAnalyzer = withBundleAnalyzerInit({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  async headers() {
    const cspReportOnly = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
      "connect-src 'self' https: wss:",
      "frame-src 'self' https:",
      "form-action 'self'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000",
          },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(self), payment=(self), usb=()",
          },
          {
            key: "Content-Security-Policy-Report-Only",
            value: cspReportOnly,
          },
        ],
      },
    ];
  },
  // Turbopack is used in dev (--turbopack flag in package.json)
  experimental: {
    // Optimise package imports for large icon/component libraries
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "recharts",
    ],
    // Server Actions
    serverActions: {
      allowedOrigins: [
        "127.0.0.1:3000",
        "venora-web.vercel.app",
        process.env.VERCEL_PROJECT_PRODUCTION_URL || "",
        process.env.VERCEL_URL || "",
      ].filter(Boolean),
    },
  },
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    remotePatterns: [
      // Supabase Storage
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Research venue image sources
      { protocol: "https", hostname: "www.theblueleaf.com", pathname: "/**" },
      {
        protocol: "https",
        hostname: "www.hillcreekgardenstagaytay.com",
        pathname: "/**",
      },
      { protocol: "https", hostname: "www.venuespring.com", pathname: "/**" },
      { protocol: "https", hostname: "villaescudero.com", pathname: "/**" },
      {
        protocol: "https",
        hostname: "cdn.jardindemiramareventsvenue.com",
        pathname: "/**",
      },
      { protocol: "https", hostname: "images.cvent.com", pathname: "/**" },
      {
        protocol: "https",
        hostname: "www.marcopolohotels.com",
        pathname: "/**",
      },
      // Squarespace-hosted venue images
      {
        protocol: "https",
        hostname: "images.squarespace-cdn.com",
        pathname: "/**",
      },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "astoriapalawan.com", pathname: "/**" },
      { protocol: "https", hostname: "pearlfarmresort.com", pathname: "/**" },
      { protocol: "https", hostname: "johnhayhotels.com", pathname: "/**" },
      // Google user images (profile photos)
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
  // NOTE: role-specific redirection for bare /dashboard is handled in
  // proxy.ts, since it needs the signed-in user's roles to pick the
  // right destination. A static redirect here can't be role-aware and
  // previously forced every role (including venue owners) to
  // /dashboard/bookings, which is why coordinators ended up on the
  // venue-owner shell instead of /dashboard/coordinator.
  // Only affects `next dev` — production builds explicitly pass --webpack
  // (see package.json) because Turbopack's `next build` was not emitting
  // .next/server/middleware.js.nft.json, which crashes Vercel's build step
  // with ENOENT even though the local build otherwise completes. Safe to
  // try dropping --webpack again on a future Next.js upgrade.
  turbopack: {
    root: path.join(configDir, "../.."),
  },
};

export default withBundleAnalyzer(nextConfig);
