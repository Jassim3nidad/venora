import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Users, Star, Globe, Mail, Phone } from "lucide-react";
import Link from "next/link";
import {
  DashboardSubPage,
  Panel,
  MaterialIcon,
} from "@/components/dashboard/enterprise";
import { getRequiredSupplierDashboardContext } from "../../_lib/supplier-dashboard-data";
import { RequestPartnershipModal } from "../RequestPartnershipModal";
import VenueGallery from "@/src/features/venues/ui/VenueGallery";

export const dynamic = "force-dynamic";

const VENUE_DETAIL_SELECT = `
  *,
  venue_packages(*),
  venue_images(id, storage_path, is_featured, display_order, media_type, alt_text),
  venue_amenities(amenities(name)),
  venue_category_assignments(venue_categories(name, slug)),
  venue_event_types(event_types(name, slug))
`;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function formatPeso(value: number | null) {
  if (!value) return null;
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(value);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ venueId: string }>;
}): Promise<Metadata> {
  const { venueId } = await params;
  // Simple metadata without full context fetch
  return { title: "Venue Details – Supplier Dashboard" };
}

export default async function SupplierVenueDetailPage({
  params,
}: {
  params: Promise<{ venueId: string }>;
}) {
  const { venueId } = await params;
  const { supabase, profile } = await getRequiredSupplierDashboardContext();

  // Fetch venue — allow any status so coordinators/suppliers can view pending venues too
  let query = supabase.from("venues").select(VENUE_DETAIL_SELECT);
  query = isUuid(venueId) ? query.eq("id", venueId) : query.eq("slug", venueId);
  const { data: venue, error: venueError } = await query.maybeSingle();
  if (venueError) console.error("[SupplierVenueDetail] query error:", venueError.message);
  console.log("[SupplierVenueDetail] venue:", venueId, "->", venue ? venue.name : "NULL");
  if (!venue) notFound();

  // Partnership status
  const existingPartnership = profile
    ? await supabase
        .from("venue_suppliers")
        .select("status")
        .eq("venue_id", venue.id)
        .eq("supplier_id", profile.id)
        .maybeSingle()
        .then((res: any) => res.data)
    : null;

  const partnershipStatus = existingPartnership?.status ?? null;

  const amenities: string[] = (venue.venue_amenities ?? [])
    .map((va: any) => va.amenities?.name)
    .filter(Boolean);

  const categories: string[] = (venue.venue_category_assignments ?? [])
    .map((vca: any) => vca.venue_categories?.name)
    .filter(Boolean);

  const eventTypes: string[] = (venue.venue_event_types ?? [])
    .map((vet: any) => vet.event_types?.name)
    .filter(Boolean);

  const activePackages = (venue.venue_packages ?? []).filter(
    (pkg: any) => pkg.is_active !== false,
  );

  return (
    <DashboardSubPage
      title={venue.name}
      description={[venue.city, venue.province].filter(Boolean).join(", ")}
      action={
        <Link
          href="/dashboard/supplier/venues"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border border-[#dbe3ef] bg-white px-4 text-sm font-bold text-[#0f172a] shadow-sm shadow-slate-200/60 transition hover:border-[#93c5fd] hover:text-[#1d4ed8]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Venues
        </Link>
      }
    >
      <div className="mx-auto max-w-5xl space-y-6">

        {/* Hero image + gallery */}
        {venue.venue_images && venue.venue_images.length > 0 && (
          <div className="-mx-4 sm:mx-0">
            <VenueGallery media={venue.venue_images} venueName={venue.name} />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main info */}
          <div className="space-y-6 lg:col-span-2">

            {/* About */}
            <Panel>
              <h2 className="mb-3 font-display text-lg font-bold text-[#111827]">About this Venue</h2>
              {venue.description ? (
                <p className="text-sm leading-relaxed text-[#4b5563]">{venue.description}</p>
              ) : (
                <p className="text-sm italic text-[#9ca3af]">No description provided.</p>
              )}

              {/* Key facts */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {(venue.capacity_min || venue.capacity_max) && (
                  <div className="flex items-center gap-2 text-sm text-[#374151]">
                    <Users className="h-4 w-4 shrink-0 text-[#6b7280]" />
                    <span>
                      {venue.capacity_min && venue.capacity_max
                        ? `${venue.capacity_min}–${venue.capacity_max} guests`
                        : venue.capacity_max
                          ? `Up to ${venue.capacity_max} guests`
                          : `From ${venue.capacity_min} guests`}
                    </span>
                  </div>
                )}
                {venue.base_price && (
                  <div className="flex items-center gap-2 text-sm text-[#374151]">
                    <MaterialIcon name="payments" className="text-base text-[#6b7280]" />
                    <span>From {formatPeso(venue.base_price)}</span>
                  </div>
                )}
                {venue.avg_rating > 0 && (
                  <div className="flex items-center gap-2 text-sm text-[#374151]">
                    <Star className="h-4 w-4 shrink-0 text-amber-500" />
                    <span>{Number(venue.avg_rating).toFixed(1)} ({venue.review_count} reviews)</span>
                  </div>
                )}
                {venue.indoor_outdoor && (
                  <div className="flex items-center gap-2 text-sm text-[#374151]">
                    <MaterialIcon name="wb_sunny" className="text-base text-[#6b7280]" />
                    <span className="capitalize">{venue.indoor_outdoor.replace("_", " ")}</span>
                  </div>
                )}
                {venue.city && (
                  <div className="flex items-center gap-2 text-sm text-[#374151]">
                    <MapPin className="h-4 w-4 shrink-0 text-[#6b7280]" />
                    <span>{[venue.city, venue.province].filter(Boolean).join(", ")}</span>
                  </div>
                )}
              </div>
            </Panel>

            {/* Categories & Event Types */}
            {(categories.length > 0 || eventTypes.length > 0) && (
              <Panel>
                {categories.length > 0 && (
                  <div className="mb-4">
                    <h3 className="mb-2 text-sm font-bold text-[#374151]">Venue Type</h3>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((c) => (
                        <span key={c} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
                {eventTypes.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-bold text-[#374151]">Suitable For</h3>
                    <div className="flex flex-wrap gap-2">
                      {eventTypes.map((e) => (
                        <span key={e} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-[#374151]">{e}</span>
                      ))}
                    </div>
                  </div>
                )}
              </Panel>
            )}

            {/* Amenities */}
            {amenities.length > 0 && (
              <Panel>
                <h2 className="mb-3 font-display text-lg font-bold text-[#111827]">Amenities</h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {amenities.map((a) => (
                    <div key={a} className="flex items-center gap-2 text-sm text-[#374151]">
                      <MaterialIcon name="check_circle" className="text-base text-emerald-500" />
                      {a}
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            {/* Packages */}
            {activePackages.length > 0 && (
              <Panel>
                <h2 className="mb-3 font-display text-lg font-bold text-[#111827]">Packages</h2>
                <div className="space-y-3">
                  {activePackages.map((pkg: any) => (
                    <div key={pkg.id} className="rounded-xl border border-[#e5e7eb] p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-[#111827]">{pkg.name}</p>
                        {pkg.price && (
                          <span className="shrink-0 text-sm font-bold text-[#1d4ed8]">
                            {formatPeso(pkg.price)}
                          </span>
                        )}
                      </div>
                      {pkg.description && (
                        <p className="mt-1 text-sm text-[#6b7280]">{pkg.description}</p>
                      )}
                      {(pkg.capacity_min || pkg.capacity_max) && (
                        <p className="mt-1 text-xs text-[#9ca3af]">
                          {pkg.capacity_min && pkg.capacity_max
                            ? `${pkg.capacity_min}–${pkg.capacity_max} guests`
                            : pkg.capacity_max
                              ? `Up to ${pkg.capacity_max} guests`
                              : `From ${pkg.capacity_min} guests`}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Partnership CTA */}
            {profile && (
              <Panel className="sticky top-24">
                <h3 className="mb-1 font-display text-base font-bold text-[#111827]">Become a Preferred Supplier</h3>
                <p className="mb-4 text-sm text-[#6b7280]">
                  Request to partner with this venue and get featured for their events.
                </p>

                {partnershipStatus === "active" ? (
                  <Link
                    href="/dashboard/supplier/partnerships"
                    className="group flex items-center gap-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4 transition-all hover:border-emerald-200 hover:bg-emerald-100/50 hover:shadow-sm"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <MaterialIcon name="check_circle" className="text-xl" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-emerald-950">Active Partner</p>
                      <p className="text-xs font-medium text-emerald-700 transition-colors group-hover:text-emerald-800">
                        View partnership details &rarr;
                      </p>
                    </div>
                  </Link>
                ) : partnershipStatus === "application_submitted" || partnershipStatus === "under_review" ? (
                  <Link
                    href="/dashboard/supplier/partnerships"
                    className="group flex items-center gap-4 rounded-xl border border-amber-100 bg-amber-50 p-4 transition-all hover:border-amber-200 hover:bg-amber-100/50 hover:shadow-sm"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                      <MaterialIcon name="pending" className="text-xl" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-amber-950">Application Pending</p>
                      <p className="text-xs font-medium text-amber-700 transition-colors group-hover:text-amber-800">
                        Track your request &rarr;
                      </p>
                    </div>
                  </Link>
                ) : partnershipStatus === "invited" ? (
                  <Link
                    href="/dashboard/supplier/partnerships"
                    className="group flex items-center gap-4 rounded-xl border border-blue-100 bg-blue-50 p-4 transition-all hover:border-blue-200 hover:bg-blue-100/50 hover:shadow-sm"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                      <MaterialIcon name="mail" className="text-xl" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-blue-950">Invited to Partner</p>
                      <p className="text-xs font-medium text-blue-700 transition-colors group-hover:text-blue-800">
                        Review and respond &rarr;
                      </p>
                    </div>
                  </Link>
                ) : (
                  <RequestPartnershipModal
                    venueId={venue.id}
                    venueName={venue.name}
                    supplierId={profile.id}
                    supplierServices={profile.packages}
                  />
                )}
              </Panel>
            )}

            {/* Contact / Owner */}
            {venue.organizations && (
              <Panel>
                <h3 className="mb-3 font-display text-base font-bold text-[#111827]">Managed by</h3>
                <div className="flex items-center gap-3">
                  {venue.organizations.logo_url ? (
                    <img
                      src={venue.organizations.logo_url}
                      alt={venue.organizations.display_name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <MaterialIcon name="business" />
                    </div>
                  )}
                  <p className="font-semibold text-[#111827]">{venue.organizations.display_name}</p>
                </div>
              </Panel>
            )}

            {/* Contact info */}
            {(venue.contact_email || venue.contact_phone || venue.website_url) && (
              <Panel>
                <h3 className="mb-3 font-display text-base font-bold text-[#111827]">Contact</h3>
                <div className="space-y-2">
                  {venue.contact_email && (
                    <a href={`mailto:${venue.contact_email}`} className="flex items-center gap-2 text-sm text-[#1d4ed8] hover:underline">
                      <Mail className="h-4 w-4 shrink-0" />
                      {venue.contact_email}
                    </a>
                  )}
                  {venue.contact_phone && (
                    <a href={`tel:${venue.contact_phone}`} className="flex items-center gap-2 text-sm text-[#374151]">
                      <Phone className="h-4 w-4 shrink-0" />
                      {venue.contact_phone}
                    </a>
                  )}
                  {venue.website_url && (
                    <a href={venue.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-[#1d4ed8] hover:underline">
                      <Globe className="h-4 w-4 shrink-0" />
                      Visit website
                    </a>
                  )}
                </div>
              </Panel>
            )}
          </div>
        </div>
      </div>
    </DashboardSubPage>
  );
}
