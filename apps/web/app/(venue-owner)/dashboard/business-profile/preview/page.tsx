import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import {
  Building2,
  CalendarCheck2,
  CheckCircle2,
  ExternalLink,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { DashboardSubPage } from "@/components/dashboard/enterprise";
import { getOwnerDashboardContext } from "../../_lib/owner-dashboard-data";
import { BusinessProfileRepository } from "@/src/features/business-profiles/data/business-profile.repository";
import { calculateProfileCompleteness } from "@/src/features/business-profiles/application/completeness";
import { PublishButton } from "./PublishButton";
import type { BusinessProfileDraft } from "@/src/features/business-profiles/types/business-profile.types";

export const metadata: Metadata = { title: "Preview Owner Profile" };

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function profileImageUrl(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("/")) return path;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  return `${supabaseUrl}/storage/v1/object/public/business-profiles/${path}`;
}

function visibleLocation(draft: BusinessProfileDraft) {
  if (draft.address_visibility === "hidden") return null;
  if (draft.address_visibility === "province") return draft.province || null;
  return [draft.city, draft.province].filter(Boolean).join(", ") || null;
}

function OwnerProfilePreview({ draft }: { draft: BusinessProfileDraft }) {
  const logoUrl = profileImageUrl(draft.logo_path);
  const coverUrl = profileImageUrl(draft.cover_image_path);
  const location = visibleLocation(draft);
  const venues = draft.published_venues ?? [];
  const publicEmail = draft.email_visibility ? draft.public_email : null;
  const publicPhone = draft.phone_visibility ? draft.public_phone : null;

  return (
    <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-sm">
      <div className="flex min-w-0 items-center gap-3 border-b border-[#e2e8f0] bg-[#f8fafc] px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#cbd5e1]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#cbd5e1]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#cbd5e1]" />
        </div>
        <div className="min-w-0 flex-1 rounded-md border border-[#e2e8f0] bg-white px-3 py-1 text-center text-xs font-bold text-[#64748b]">
          venora.ph/owners/{draft.slug || "..."}
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8">
        {coverUrl ? (
          <div className="relative h-40 overflow-hidden rounded-xl bg-[#f1f5f9] sm:h-56">
            <img src={coverUrl} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-slate-950/20" />
          </div>
        ) : null}

        <section className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#2563eb] text-2xl font-bold text-white">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                initials(draft.display_name) || "VO"
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                {draft.verification_status === "verified" ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                    <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                    Business details verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2563eb]">
                    <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                    Venora venue owner
                  </span>
                )}
                <span className="text-xs font-bold text-[#64748b]">
                  {venues.length} published venue
                  {venues.length === 1 ? "" : "s"}
                </span>
              </div>
              <h2 className="mt-3 break-words text-3xl font-bold leading-tight text-[#0f172a]">
                {draft.display_name}
              </h2>
              {draft.tagline ? (
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#475569]">
                  {draft.tagline}
                </p>
              ) : null}
              {location ? (
                <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#64748b]">
                  <MapPin
                    aria-hidden="true"
                    className="h-4 w-4 text-[#2563eb]"
                  />
                  {location}
                </p>
              ) : null}
            </div>
          </div>

          <a
            href={`/owners/${draft.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#dbeafe] bg-[#eff6ff] px-4 text-sm font-bold text-[#2563eb] transition hover:bg-[#dbeafe]"
          >
            Open public profile
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
          </a>
        </section>

        <div className="mt-8 grid gap-6 border-t border-[#e2e8f0] pt-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="min-w-0">
            <h3 className="text-lg font-bold text-[#0f172a]">
              About this owner
            </h3>
            {draft.short_description ? (
              <p className="mt-3 text-sm font-bold leading-6 text-[#334155]">
                {draft.short_description}
              </p>
            ) : null}
            <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-7 text-[#475569]">
              {draft.about ||
                "Add an about section so customers can understand your venue business before booking."}
            </p>

            <div className="mt-8">
              <h3 className="text-lg font-bold text-[#0f172a]">
                Managed venues
              </h3>
              {venues.length > 0 ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {venues.slice(0, 4).map((venue) => (
                    <div
                      key={venue.id}
                      className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-4"
                    >
                      <div className="flex items-start gap-3">
                        <Building2
                          aria-hidden="true"
                          className="mt-0.5 h-5 w-5 shrink-0 text-[#2563eb]"
                        />
                        <div className="min-w-0">
                          <p className="break-words text-sm font-bold text-[#0f172a]">
                            {venue.name}
                          </p>
                          {venue.slug ? (
                            <p className="mt-1 text-xs font-semibold text-[#64748b]">
                              /venues/{venue.slug}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-6 text-sm font-semibold text-[#64748b]">
                  Add or publish a venue first so customers can see listings on
                  this owner profile.
                </div>
              )}
            </div>
          </section>

          <aside className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-5">
            <h3 className="text-base font-bold text-[#0f172a]">
              Profile signals
            </h3>
            <ul className="mt-4 space-y-3 text-sm font-semibold text-[#475569]">
              {draft.year_established ? (
                <li className="flex gap-3">
                  <CalendarCheck2
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 text-[#2563eb]"
                  />
                  <span>Established in {draft.year_established}</span>
                </li>
              ) : null}
              <li className="flex gap-3">
                <Building2
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 text-[#2563eb]"
                />
                <span>
                  {venues.length} public venue{venues.length === 1 ? "" : "s"}
                </span>
              </li>
              {publicEmail ? (
                <li className="break-all">Email: {publicEmail}</li>
              ) : null}
              {publicPhone ? (
                <li className="break-all">Phone: {publicPhone}</li>
              ) : null}
              {draft.website_url ? (
                <li className="break-all">Website: {draft.website_url}</li>
              ) : null}
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default async function BusinessProfilePreviewPage() {
  const { supabase, orgIds, isAdmin } = await getOwnerDashboardContext();

  if (!isAdmin && orgIds.length === 0) {
    redirect("/dashboard");
  }

  const organizationId = orgIds[0] as string;
  const repo = new BusinessProfileRepository(supabase as any);
  const draft = await repo.getDraftByOrganization(organizationId);

  if (!draft) return notFound();

  const completeness = calculateProfileCompleteness(draft);

  return (
    <DashboardSubPage
      title="Preview Profile"
      description="Review the public owner profile details customers will see before publishing."
      action={
        <div className="flex items-center gap-3">
          <a
            href="/dashboard/business-profile"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-white px-4 text-sm font-bold text-[#334155] shadow-sm ring-1 ring-inset ring-[#e2e8f0] transition hover:bg-[#f8fafc] hover:text-[#0f172a]"
          >
            Back to Editor
          </a>
          {completeness.isEligibleForPublish ? (
            <PublishButton
              profileId={draft.id}
              organizationId={organizationId}
            />
          ) : (
            <button
              disabled
              className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-200 px-4 text-sm font-bold text-slate-400 cursor-not-allowed"
              title={`Missing: ${completeness.missingItems.join(", ")}`}
            >
              Missing Requirements
            </button>
          )}
        </div>
      }
    >
      <div className="mb-5 rounded-lg border border-[#bfdbfe] bg-[#eff6ff] p-4 text-sm font-semibold text-[#1e40af]">
        This preview uses your saved draft fields. Customers will see these
        details on the owner profile after you publish.
      </div>
      <OwnerProfilePreview draft={draft} />
    </DashboardSubPage>
  );
}
