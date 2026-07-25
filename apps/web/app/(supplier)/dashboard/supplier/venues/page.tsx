import type { Metadata } from "next";
import {
  DashboardSubPage,
  EmptyState,
  Panel,
  MaterialIcon,
} from "@/components/dashboard/enterprise";
import { getRequiredSupplierDashboardContext } from "../_lib/supplier-dashboard-data";
import { searchMarketplaceVenues } from "@/features/venues/application/queries";
import Link from "next/link";
import Image from "next/image";
import { RequestPartnershipModal } from "./RequestPartnershipModal";
import { buildVenueImageUrl, firstVenueImage } from "@/src/features/venues/utils/venue-mappers";

export const metadata: Metadata = {
  title: "Discover Venues - Supplier Dashboard",
};

export const dynamic = "force-dynamic";

export default async function SupplierDiscoverVenuesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const { supabase, profile } = await getRequiredSupplierDashboardContext();

  if (!profile) {
    return (
      <DashboardSubPage
        title="Discover Venues"
        description="Browse venues and request to become a preferred supplier."
      >
        <div className="mx-auto max-w-lg px-4 py-12">
          <EmptyState
            icon="storefront"
            title="Profile Setup Pending"
            description="Create your supplier profile first before you can request partnerships."
          />
        </div>
      </DashboardSubPage>
    );
  }

  const resolvedSearchParams = await searchParams;
  const q = resolvedSearchParams.q ?? "";
  const province = resolvedSearchParams.province ?? "";

  // 1. Fetch distinct provinces for the filter dropdown
  const { data: provinceRows } = await supabase
    .from("venues")
    .select("province")
    .eq("status", "published")
    .not("province", "is", null)
    .order("province", { ascending: true });

  const provinces: string[] = Array.from(
    new Set((provinceRows ?? []).map((r: any) => r.province as string).filter(Boolean)),
  );

  // 2. Fetch active published venues, filtered by search query and/or province
  const { data: venuesRaw } = await searchMarketplaceVenues(supabase, {
    q,
    province: province || undefined,
    limit: 48,
  });

  const venues = venuesRaw ?? [];

  // 3. Fetch existing partnership requests to know which ones we are already partnered with
  const { data: existingPartnerships } = await supabase
    .from("venue_suppliers")
    .select("venue_id, status")
    .eq("supplier_id", profile.id);

  const partnershipMap = new Map(
    (existingPartnerships ?? []).map((p: any) => [p.venue_id, p.status]),
  );

  return (
    <DashboardSubPage
      title="Discover Venues"
      description="Find venues in your area and apply to be a preferred supplier."
    >
      <Panel className="mb-6">
        <form className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-0 flex-1">
            <MaterialIcon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]"
            />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search venues by name or location..."
              className="h-11 w-full rounded-xl border border-[#e5e7eb] bg-white pl-10 pr-3 text-sm font-medium text-[#111827] outline-none focus:border-[#1d4ed8] focus:ring-4 focus:ring-[#1d4ed8]/10"
            />
          </div>

          {/* Province filter */}
          <div className="relative">
            <MaterialIcon
              name="location_on"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]"
            />
            <select
              name="province"
              defaultValue={province}
              className="h-11 appearance-none rounded-xl border border-[#e5e7eb] bg-white pl-10 pr-8 text-sm font-medium text-[#111827] outline-none focus:border-[#1d4ed8] focus:ring-4 focus:ring-[#1d4ed8]/10"
            >
              <option value="">All Provinces</option>
              {provinces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <MaterialIcon
              name="expand_more"
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#9ca3af]"
            />
          </div>

          {/* "Near Me" shortcut — pre-fills the supplier's own province */}
          {profile.province && profile.province !== province && (
            <a
              href={`?province=${encodeURIComponent(profile.province)}`}
              className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-[#e5e7eb] bg-white px-4 text-sm font-medium text-[#374151] transition hover:border-[#1d4ed8] hover:text-[#1d4ed8]"
            >
              <MaterialIcon name="near_me" className="text-base" />
              Near Me
            </a>
          )}

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1d4ed8] px-5 text-sm font-bold text-white transition hover:bg-[#1e40af]"
          >
            Search
          </button>
        </form>

        {/* Active filter chips */}
        {(q || province) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {province && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                <MaterialIcon name="location_on" className="text-xs" />
                {province}
                <a
                  href={q ? `?q=${encodeURIComponent(q)}` : "?"}
                  className="ml-1 hover:text-blue-900"
                  aria-label="Remove province filter"
                >
                  <MaterialIcon name="close" className="text-xs" />
                </a>
              </span>
            )}
            {q && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                &quot;{q}&quot;
                <a
                  href={province ? `?province=${encodeURIComponent(province)}` : "?"}
                  className="ml-1 hover:text-slate-900"
                  aria-label="Clear search"
                >
                  <MaterialIcon name="close" className="text-xs" />
                </a>
              </span>
            )}
          </div>
        )}
      </Panel>

      {venues.length > 0 ? (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {venues.map((venue: any) => {
              const status = partnershipMap.get(venue.id) as string | undefined;
              return (
                <div key={venue.id} className="flex flex-col overflow-hidden rounded-2xl border border-[#dbe3ef] bg-white shadow-sm transition hover:shadow-md">
                  <div className="relative h-48 w-full bg-slate-100">
                    {firstVenueImage(venue)?.storage_path ? (
                      <Image
                        src={buildVenueImageUrl(firstVenueImage(venue).storage_path)}
                        alt={venue.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-300">
                        <MaterialIcon name="business" className="text-5xl" />
                      </div>
                    )}
                    
                    {/* Status Badge Overlaid on Image */}
                    {status && (
                      <div className="absolute right-3 top-3">
                        {status === "active" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 shadow-sm">
                            <MaterialIcon name="check_circle" className="text-xs" />
                            Active Partner
                          </span>
                        ) : status === "application_submitted" || status === "under_review" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 shadow-sm">
                            <MaterialIcon name="pending" className="text-xs" />
                            Pending Request
                          </span>
                        ) : status === "invited" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700 shadow-sm">
                            <MaterialIcon name="mail" className="text-xs" />
                            Invited
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col flex-1 p-5">
                    <div className="mb-4">
                      <p className="font-display text-lg font-bold text-[#111827] line-clamp-2">
                        {venue.name}
                      </p>
                      <p className="text-sm font-medium text-[#6b7280]">
                        {[venue.city, venue.province].filter(Boolean).join(", ") || "Location unlisted"}
                      </p>
                    </div>
                    
                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Link
                        href={`/dashboard/supplier/venues/${venue.id}`}
                        className="text-sm font-semibold text-[#374151] hover:text-[#1d4ed8] hover:underline"
                      >
                        View details
                      </Link>
                      {!status ? (
                        <RequestPartnershipModal
                          venueId={venue.id}
                          venueName={venue.name}
                          supplierId={profile.id}
                          supplierServices={profile.packages}
                        />
                      ) : status === "invited" ? (
                        <Link
                          href="/dashboard/supplier/partnerships"
                          className="text-sm font-bold text-[#1d4ed8] hover:underline"
                        >
                          Respond to Invite
                        </Link>
                      ) : (
                        <Link
                          href="/dashboard/supplier/partnerships"
                          className="text-sm font-bold text-[#4b5563] hover:underline"
                        >
                          View Status
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-lg px-4 py-12">
          <EmptyState
            icon="search_off"
            title="No Venues Found"
            description={
              province
                ? `No published venues found in ${province}. Try a different province or clear the filter.`
                : "Try adjusting your search criteria."
            }
          />
        </div>
      )}
    </DashboardSubPage>
  );
}
