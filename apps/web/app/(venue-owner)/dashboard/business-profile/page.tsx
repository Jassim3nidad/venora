import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DashboardSubPage } from "@/components/dashboard/enterprise";
import { getOwnerDashboardContext } from "../_lib/owner-dashboard-data";
import { BusinessProfileRepository } from "@/src/features/business-profiles/data/business-profile.repository";
import { BusinessProfileEditor } from "@/src/features/business-profiles/ui/BusinessProfileEditor";
import { calculateProfileCompleteness } from "@/src/features/business-profiles/application/completeness";

export const metadata: Metadata = { title: "Business Profile - Dashboard" };

export default async function BusinessProfilePage() {
  const { supabase, orgIds, isAdmin } = await getOwnerDashboardContext();

  if (!isAdmin && orgIds.length === 0) {
    return (
      <DashboardSubPage
        title="Business Profile"
        description="Manage your business's public profile."
      >
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#e5e7eb] py-16 text-center">
          <p className="text-sm font-semibold text-[#64748b]">
            You don't have an active organization to manage.
          </p>
        </div>
      </DashboardSubPage>
    );
  }

  const organizationId = orgIds[0] as string;
  const repo = new BusinessProfileRepository(supabase as any);
  const draft = await repo.getDraftByOrganization(organizationId);

  if (!draft) {
    // If somehow the seeding failed, we could gracefully handle it,
    // but the migration ensures organizations have a profile.
    return notFound();
  }

  const completeness = calculateProfileCompleteness(draft);

  return (
    <DashboardSubPage
      title="Business Profile"
      description="Manage how your business appears to customers."
      action={
        <a
          href="/dashboard/business-profile/preview"
          className="inline-flex h-9 items-center justify-center rounded-xl bg-white px-4 text-sm font-bold text-[#334155] shadow-sm ring-1 ring-inset ring-[#e2e8f0] transition hover:bg-[#f8fafc] hover:text-[#0f172a]"
        >
          Preview & Publish
        </a>
      }
    >
      <div className="mb-6 rounded-xl border border-[#e5e7eb] bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#0f172a]">
              Profile Completeness
            </h3>
            <p className="mt-1 text-sm text-[#64748b]">
              {completeness.percentage}% complete.
              {completeness.isEligibleForPublish
                ? " Your profile is eligible to be published."
                : " Complete the required fields to publish."}
            </p>
          </div>
          <div className="text-2xl font-bold text-[#2563eb]">
            {completeness.percentage}%
          </div>
        </div>
        {!completeness.isEligibleForPublish && (
          <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            <strong>Missing requirements:</strong>{" "}
            {completeness.missingItems.join(", ")}
          </div>
        )}
      </div>

      <BusinessProfileEditor draft={draft} organizationId={organizationId} />
    </DashboardSubPage>
  );
}
