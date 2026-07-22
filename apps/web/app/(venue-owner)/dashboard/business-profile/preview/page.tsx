import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { DashboardSubPage } from "@/components/dashboard/enterprise";
import { getOwnerDashboardContext } from "../../_lib/owner-dashboard-data";
import { BusinessProfileRepository } from "@/src/features/business-profiles/data/business-profile.repository";
import { BusinessProfileView } from "@/src/features/business-profiles/ui/BusinessProfileView";
import { calculateProfileCompleteness } from "@/src/features/business-profiles/application/completeness";
import { PublishButton } from "./PublishButton";
import { BusinessProfilePublicView } from "@/src/features/business-profiles/types/business-profile.types";

export const metadata: Metadata = { title: "Preview Business Profile" };

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

  // Generate a mock snapshot for preview
  const previewSnapshot: BusinessProfilePublicView = {
    id: draft.id,
    slug: draft.slug,
    displayName: draft.display_name,
    tagline: draft.tagline,
    shortDescription: draft.short_description,
    about: draft.about,
    primaryCategory: draft.primary_category,
    yearEstablished: draft.year_established,
    logoPath: draft.logo_path,
    coverImagePath: draft.cover_image_path,
    city: draft.address_visibility !== "hidden" ? draft.city : null,
    province: draft.address_visibility !== "hidden" ? draft.province : null,
    countryCode: draft.address_visibility !== "hidden" ? draft.country_code : null,
    publicEmail: draft.email_visibility ? draft.public_email : null,
    publicPhone: draft.phone_visibility ? draft.public_phone : null,
    websiteUrl: draft.website_url,
    verificationStatus: draft.verification_status,
    venues: (draft.venues || []).filter(v => v.is_visible).sort((a, b) => a.display_order - b.display_order),
    portfolio: (draft.portfolio || []).filter(p => p.is_visible).sort((a, b) => a.display_order - b.display_order),
    team: (draft.team || []).filter(t => t.is_visible).sort((a, b) => a.display_order - b.display_order),
    socialLinks: (draft.social_links || []).filter(s => s.is_visible).sort((a, b) => a.display_order - b.display_order),
    policies: (draft.policies || []).filter(p => p.is_visible).sort((a, b) => a.display_order - b.display_order),
  };

  return (
    <DashboardSubPage
      title="Preview Profile"
      description="Review how your profile will appear to customers before publishing."
      action={
        <div className="flex items-center gap-3">
          <a
            href="/dashboard/business-profile"
            className="inline-flex h-9 items-center justify-center rounded-xl bg-white px-4 text-sm font-bold text-[#334155] shadow-sm ring-1 ring-inset ring-[#e2e8f0] transition hover:bg-[#f8fafc] hover:text-[#0f172a]"
          >
            Back to Editor
          </a>
          {completeness.isEligibleForPublish ? (
            <PublishButton profileId={draft.id} organizationId={organizationId} />
          ) : (
            <button
              disabled
              className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-200 px-4 text-sm font-bold text-slate-400 cursor-not-allowed"
              title={`Missing: ${completeness.missingItems.join(", ")}`}
            >
              Missing Requirements
            </button>
          )}
        </div>
      }
    >
      <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden shadow-inner">
        <div className="h-10 bg-slate-200 flex items-center px-4 gap-2 border-b border-slate-300">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-400" />
            <div className="h-3 w-3 rounded-full bg-amber-400" />
            <div className="h-3 w-3 rounded-full bg-emerald-400" />
          </div>
          <div className="mx-auto bg-white px-3 py-1 text-xs rounded-md text-slate-500 shadow-sm border border-slate-200">
            venora.ph/partners/{draft.slug || "..."}
          </div>
        </div>
        <div className="bg-white">
          <BusinessProfileView profile={previewSnapshot} isPreview={true} />
        </div>
      </div>
    </DashboardSubPage>
  );
}
