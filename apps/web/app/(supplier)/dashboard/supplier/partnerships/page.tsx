import type { Metadata } from "next";
import Link from "next/link";
import {
  DashboardSubPage,
  EmptyState,
  Panel,
  MaterialIcon,
} from "@/components/dashboard/enterprise";
import { getRequiredSupplierDashboardContext } from "../_lib/supplier-dashboard-data";

import { SupplierAgreementsList } from "@/src/features/suppliers/ui/SupplierAgreementsList";
import { ActivePartnershipCard } from "@/src/features/suppliers/ui/ActivePartnershipCard";
import { PartnershipInviteActions } from "@/src/features/suppliers/ui/PartnershipInviteActions";
import { getPartnershipMessages } from "@/src/features/venues/application/partnership-messages-actions";

export const metadata: Metadata = {
  title: "Venue Partnerships - Supplier Dashboard",
};

export const dynamic = "force-dynamic";

function formatPeso(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return `₱${Number(value).toLocaleString("en-PH")}`;
}

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function SupplierPartnershipsPage() {
  const { supabase, profile } = await getRequiredSupplierDashboardContext();

  if (!profile) {
    return (
      <DashboardSubPage
        title="Venue Partnerships"
        description="Venues that have added you as a preferred partner."
      >
        <div className="mx-auto max-w-lg px-4 py-12">
          <EmptyState
            icon="storefront"
            title="Profile Setup Pending"
            description="Create your supplier profile first before you can view partnerships."
          />
        </div>
      </DashboardSubPage>
    );
  }

  const { data: partnerships, error } = await supabase
    .from("venue_suppliers")
    .select(`
      id,
      is_preferred,
      status,
      venues (
        id,
        name,
        city,
        province,
        organization_id
      )
    `)
    .eq("supplier_id", profile.id);

  const { data: agreements } = await supabase
    .from("venue_supplier_agreements")
    .select(`
      *,
      venues (name)
    `)
    .eq("supplier_id", profile.id)
    .order("created_at", { ascending: false });

  const { data: packageInclusions } = await supabase
    .from("package_suppliers")
    .select(`
      id,
      included_price,
      venue_packages (
        id,
        name,
        is_active,
        price,
        venues (id, name, slug)
      )
    `)
    .eq("supplier_id", profile.id);

  if (error) {
    console.error("[SupplierPartnerships] failed to fetch:", error.message);
  }

  const list = (partnerships ?? []) as any[];

  const activePartnerships = list.filter((p) => p.status === "active");
  const pendingRequests = list.filter((p) =>
    ["application_submitted", "under_review"].includes(p.status),
  );
  const invitations = list.filter((p) => p.status === "invited");

  const { data: authUser } = await supabase.auth.getUser();
  const currentUserId = authUser.user?.id ?? "";

  const partnershipMessageMap: Record<string, any[]> = {};
  for (const p of activePartnerships) {
    const venue = asOne(p.venues);
    if (p.id && venue?.organization_id) {
      partnershipMessageMap[p.id] = await getPartnershipMessages(
        venue.organization_id,
        profile.id,
      );
    }
  }

  const inclusions = (packageInclusions ?? [])
    .map((row: any) => {
      const pkg = asOne(row.venue_packages);
      const venue = asOne(pkg?.venues);
      if (!pkg || !venue) return null;
      return {
        id: row.id as string,
        includedPrice: Number(row.included_price ?? 0),
        packageName: pkg.name as string,
        packageActive: pkg.is_active !== false,
        packagePrice: Number(pkg.price ?? 0),
        venueId: venue.id as string,
        venueName: venue.name as string,
        venueSlug: venue.slug as string | null,
      };
    })
    .filter(Boolean) as Array<{
    id: string;
    includedPrice: number;
    packageName: string;
    packageActive: boolean;
    packagePrice: number;
    venueId: string;
    venueName: string;
    venueSlug: string | null;
  }>;

  return (
    <DashboardSubPage
      title="Venue Partnerships"
      description="Accept venue invites, manage agreements, and track packages that include your services."
    >
      <div className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6 lg:px-8">
        {agreements && agreements.length > 0 && (
          <SupplierAgreementsList agreements={agreements} />
        )}

        {invitations.length > 0 && (
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-900">
              <MaterialIcon name="mail" className="text-blue-600" />
              Venue Invitations
            </h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {invitations.map((partnership, idx) => {
                const venue = asOne(partnership.venues);
                if (!venue) return null;
                return (
                  <Panel
                    key={partnership.id || venue.id || idx}
                    className="flex flex-col gap-3 border-blue-200 bg-blue-50/50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                        <MaterialIcon name="mark_email_unread" />
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-800">
                        Invited
                      </span>
                    </div>
                    <div>
                      <p className="font-display text-lg font-bold text-slate-900">
                        {venue.name}
                      </p>
                      <p className="text-sm font-medium text-slate-500">
                        {[venue.city, venue.province].filter(Boolean).join(", ") ||
                          "Location unlisted"}
                      </p>
                    </div>
                    <PartnershipInviteActions partnershipId={partnership.id} />
                  </Panel>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-900">
            <MaterialIcon name="inventory_2" className="text-indigo-600" />
            Package inclusions
          </h2>
          {inclusions.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {inclusions.map((item) => (
                <Panel key={item.id} className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-lg font-bold text-slate-900">
                        {item.packageName}
                      </p>
                      <p className="text-sm font-medium text-slate-500">
                        {item.venueName}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                        item.packageActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.packageActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-700">
                    Your included price: {formatPeso(item.includedPrice)}
                  </div>
                  <p className="text-xs font-medium text-slate-500">
                    Package price: {formatPeso(item.packagePrice)}
                  </p>
                  <Link
                    href={`/dashboard/supplier/venues/${item.venueId}`}
                    className="text-sm font-bold text-blue-600 hover:underline"
                  >
                    View venue
                  </Link>
                </Panel>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <MaterialIcon
                name="inventory_2"
                className="mb-2 text-4xl text-slate-400"
              />
              <h3 className="mb-1 text-lg font-bold text-slate-900">
                Not in any venue packages yet
              </h3>
              <p className="text-sm text-slate-500">
                After an active partnership and commercial agreement, venue
                owners can add you to packages. Those inclusions appear here.
              </p>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-900">
            <MaterialIcon name="handshake" className="text-emerald-600" />
            Active Partnerships
          </h2>
          {activePartnerships.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {activePartnerships.map((partnership, idx) => {
                const venue = asOne(partnership.venues);
                if (!venue) return null;

                const agreement = agreements?.find(
                  (a: any) =>
                    a.venue_id === venue.id && a.status === "active",
                );

                return (
                  <ActivePartnershipCard
                    key={partnership.id || idx}
                    partnership={{ ...partnership, venues: venue }}
                    agreement={agreement}
                    messages={
                      partnership.id
                        ? (partnershipMessageMap[partnership.id] ?? [])
                        : []
                    }
                    currentUserId={currentUserId}
                    currentUserName={
                      (profile as any).business_name ??
                      (profile as any).businessName ??
                      "Supplier"
                    }
                    counterpartRole="Venue Team"
                  />
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
              <MaterialIcon
                name="handshake"
                className="mb-2 text-4xl text-slate-400"
              />
              <h3 className="mb-1 text-lg font-bold text-slate-900">
                No Active Partnerships
              </h3>
              <p className="text-sm text-slate-500">
                Accept a venue invite or get an owner approval after you apply —
                then commercial agreements and package inclusions can follow.
              </p>
            </div>
          )}
        </section>

        {pendingRequests.length > 0 && (
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-900">
              <MaterialIcon name="hourglass_empty" className="text-amber-600" />
              Pending Requests
            </h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {pendingRequests.map((partnership, idx) => {
                const venue = asOne(partnership.venues);
                if (!venue) return null;
                return (
                  <Panel
                    key={partnership.id || venue.id || idx}
                    className="flex flex-col gap-3 opacity-75"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                        <MaterialIcon name="pending_actions" />
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                        {partnership.status === "under_review"
                          ? "Under Review"
                          : "Submitted"}
                      </span>
                    </div>
                    <div>
                      <p className="font-display text-lg font-bold text-slate-900">
                        {venue.name}
                      </p>
                      <p className="text-sm font-medium text-slate-500">
                        {[venue.city, venue.province].filter(Boolean).join(", ") ||
                          "Location unlisted"}
                      </p>
                    </div>
                  </Panel>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </DashboardSubPage>
  );
}
