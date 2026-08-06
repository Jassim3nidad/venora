"use client";

import {
  type ProfileSectionId,
  type ProfileSectionStatus
} from "@/src/features/venues/utils/structured-editor";
import { type DraftStructuredVenueProfile } from "@/src/features/venues/domain/structured-venue.types";
import { Panel } from "@/components/dashboard/enterprise";
import { Send, AlertCircle, Info, ChevronRight, CheckCircle2 } from "lucide-react";
import { DashButton } from "@/components/dashboard/enterprise";

export function ReviewPublishWorkspace({
  venue,
  profile,
  statuses,
  canPublish,
  onPublish,
  onNavigate,
}: {
  venue: { id: string; name: string; description: string | null };
  profile: DraftStructuredVenueProfile;
  statuses: Record<ProfileSectionId, ProfileSectionStatus>;
  canPublish: boolean;
  onPublish: () => void;
  onNavigate: (sectionId: ProfileSectionId) => void;
}) {
  const issues = statuses.review.issues;
  const requiredIssues = issues.filter((i) => i.severity === "required");
  const recommendedIssues = issues.filter((i) => i.severity === "recommended");

  return (
    <Panel padding={false} className="overflow-hidden">
      <div className="border-b border-[#e5e7eb] bg-[#f8fbff] px-5 py-3 text-sm font-bold text-[#1d4ed8]">
        Publishing Readiness
      </div>
      <div className="p-5 sm:p-6 lg:p-8">
        
        {/* Header Section */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold text-[#0f172a]">Ready to go live?</h2>
            <p className="mt-2 text-sm leading-6 text-[#64748b]">
              Review your venue&apos;s new structured profile. Once published, this new format replaces your old base listing and provides customers with a rich, detailed booking experience.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <DashButton href={`/dashboard/venues/${venue.id}/experience/preview`} variant="secondary" icon="visibility">
              Preview Customer View
            </DashButton>
            <button
              type="button"
              onClick={onPublish}
              disabled={!canPublish || requiredIssues.length > 0}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1d4ed8] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1e40af] disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Publish Profile
            </button>
          </div>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          
          {/* Left Column: Issues */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-[#0f172a] border-b border-[#e5e7eb] pb-2 mb-4">Readiness Checklist</h3>
              
              {requiredIssues.length === 0 && recommendedIssues.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800">
                  <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
                  <div>
                    <h4 className="font-bold">Your profile looks great!</h4>
                    <p className="text-sm">You have provided all the recommended information.</p>
                  </div>
                </div>
              ) : null}

              {requiredIssues.length > 0 && (
                <div className="space-y-3 mt-4">
                  <h4 className="text-sm font-bold text-red-700 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Required to Publish ({requiredIssues.length})
                  </h4>
                  {requiredIssues.map((issue) => (
                    <div key={issue.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 transition hover:border-red-300">
                      <div>
                        <h5 className="font-bold text-red-900">{issue.title}</h5>
                        <p className="mt-1 text-sm text-red-700">{issue.description}</p>
                      </div>
                      <button
                        onClick={() => onNavigate(issue.target.sectionId)}
                        className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-red-700 shadow-sm border border-red-200 transition hover:bg-red-50"
                      >
                        {issue.actionLabel}
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {recommendedIssues.length > 0 && (
                <div className="space-y-3 mt-6">
                  <h4 className="text-sm font-bold text-amber-700 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Recommended ({recommendedIssues.length})
                  </h4>
                  {recommendedIssues.map((issue) => (
                    <div key={issue.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 transition hover:border-amber-300">
                      <div>
                        <h5 className="font-bold text-amber-900">{issue.title}</h5>
                        <p className="mt-1 text-sm text-amber-800">{issue.description}</p>
                      </div>
                      <button
                        onClick={() => onNavigate(issue.target.sectionId)}
                        className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-amber-700 shadow-sm border border-amber-200 transition hover:bg-amber-50"
                      >
                        {issue.actionLabel}
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Summary of Changes */}
          <div>
            <h3 className="text-lg font-bold text-[#0f172a] border-b border-[#e5e7eb] pb-2 mb-4">What Customers Will See</h3>
            
            <div className="space-y-4">
              <div className="rounded-xl border border-[#dbe3ef] bg-[#f8fbff] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-[#0f172a]">Spaces</h4>
                    <p className="text-sm text-[#64748b]">{profile.spaces.filter(s => s.status !== "archived").length} available to book</p>
                  </div>
                  {statuses.spaces.completionState === "complete" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-dashed border-[#94a3b8]" />
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.spaces.filter((space) => space.status !== "archived").map((space) => (
                    <span key={space.id} className="inline-flex items-center rounded-md bg-white border border-[#cbd5e1] px-2 py-1 text-xs font-medium text-[#334155]">
                      {space.name} ({space.capacityMax} max)
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[#dbe3ef] bg-[#f8fbff] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-[#0f172a]">Media & Galleries</h4>
                    <p className="text-sm text-[#64748b]">{profile.mediaItems.length} photos/videos across {profile.mediaCollections.length} collections</p>
                  </div>
                  {statuses.media.completionState === "complete" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-dashed border-[#94a3b8]" />
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-[#dbe3ef] bg-[#f8fbff] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-[#0f172a]">Logistics</h4>
                    <p className="text-sm text-[#64748b]">{statuses.logistics.completionState === "complete" ? "Practical info provided" : "Missing practical info"}</p>
                  </div>
                  {statuses.logistics.completionState === "complete" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-dashed border-[#94a3b8]" />
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-[#dbe3ef] bg-[#f8fbff] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-[#0f172a]">Packages</h4>
                    <p className="text-sm text-[#64748b]">{profile.packageSpaces.length} space-package links</p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
              </div>

            </div>
          </div>
          
        </div>
      </div>
    </Panel>
  );
}
