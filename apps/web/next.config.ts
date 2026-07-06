import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack is used in dev (--turbopack flag in package.json)
  experimental: {
    // Optimise package imports for large icon/component libraries
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
    // Server Actions
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "localhost:3001",
        "venora-web.vercel.app",
        process.env.VERCEL_PROJECT_PRODUCTION_URL || "",
        process.env.VERCEL_URL || ""
      ].filter(Boolean),
    },
  },
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
  // Redirect bare /dashboard to role-specific dashboards
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/dashboard/bookings",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
