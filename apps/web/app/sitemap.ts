import type { MetadataRoute } from "next";
import { createServiceClient } from "@/lib/supabase/service";
import { researchVenues } from "@/src/features/venues/data/research-venues";
import { SITE_URL } from "@/src/lib/site-url";

const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/venues", changeFrequency: "daily", priority: 0.9 },
  { path: "/suppliers", changeFrequency: "daily", priority: 0.9 },
  { path: "/about", changeFrequency: "monthly", priority: 0.5 },
  { path: "/features", changeFrequency: "monthly", priority: 0.5 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.5 },
  { path: "/careers", changeFrequency: "monthly", priority: 0.3 },
  { path: "/newsroom", changeFrequency: "weekly", priority: 0.4 },
  { path: "/help", changeFrequency: "monthly", priority: 0.3 },
  { path: "/safety", changeFrequency: "monthly", priority: 0.3 },
  { path: "/host-protection", changeFrequency: "monthly", priority: 0.3 },
  { path: "/hosting-resources", changeFrequency: "monthly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // Static research-venue dataset — served at /venues/[slug] as a fallback
  // when no matching DB row exists (see getResearchVenueByIdentifier).
  const researchEntries: MetadataRoute.Sitemap = researchVenues.map((venue) => ({
    url: `${SITE_URL}/venues/${venue.slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  let dbEntries: MetadataRoute.Sitemap = [];
  try {
    const supabase = createServiceClient();

    const [{ data: venues }, { data: suppliers }] = await Promise.all([
      supabase
        .from("venues")
        .select("slug, updated_at")
        .eq("status", "published"),
      supabase
        .from("supplier_profiles")
        .select("slug, updated_at")
        .eq("accreditation_status", "accredited"),
    ]);

    dbEntries = [
      ...(venues ?? []).map((venue) => ({
        url: `${SITE_URL}/venues/${venue.slug}`,
        lastModified: venue.updated_at ? new Date(venue.updated_at) : undefined,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...(suppliers ?? []).map((supplier) => ({
        url: `${SITE_URL}/suppliers/${supplier.slug}`,
        lastModified: supplier.updated_at ? new Date(supplier.updated_at) : undefined,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    ];
  } catch (error) {
    // Sitemap generation must never 500 the route — fall back to static +
    // research-dataset entries only, and let the failure surface in logs.
    console.error("[sitemap] Failed to fetch DB-backed URLs:", error);
  }

  return [...staticEntries, ...dbEntries, ...researchEntries];
}
