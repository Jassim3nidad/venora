import type { MetadataRoute } from "next";
import { SITE_URL } from "@/src/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/",
        "/dashboard",
        "/dashboard/",
        "/account",
        "/account/",
        "/bookings",
        "/bookings/",
        "/settings",
        "/notifications",
        "/api/",
        "/auth/callback",
        "/unauthorized",
        "/profile/setup",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
