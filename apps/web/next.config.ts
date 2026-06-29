import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack is used in dev (--turbopack flag in package.json)
  experimental: {
    // Optimise package imports for large icon/component libraries
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
    // Server Actions
    serverActions: {
      allowedOrigins: ["localhost:3000"],
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
      // Placeholder images for development
      {
        protocol: "https",
        hostname: "images.unsplash.com",
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
