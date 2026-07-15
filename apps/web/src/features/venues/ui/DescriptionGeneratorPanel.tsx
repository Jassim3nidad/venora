"use client";

import { useState } from "react";
import { Sparkles, Check, X, RotateCcw, Loader2 } from "lucide-react";
import { Panel, PanelHeader } from "@/components/dashboard/enterprise";
import { useGenerateVenueDescription } from "../hooks/use-generate-venue-description";
import {
  approveGeneratedContentAction,
  rejectGeneratedContentAction,
} from "../application/actions";
import {
  generatedContentTypeOptions,
  generatedContentToneOptions,
  type GeneratedContent,
} from "../schemas/ai-description.schema";

const contentTypeLabels: Record<
  (typeof generatedContentTypeOptions)[number],
  string
> = {
  description: "Venue description",
  seo_meta: "SEO meta description",
  package_description: "Package description",
};

interface VenuePackageOption {
  id: string;
  name: string;
}

interface DescriptionGeneratorPanelProps {
  venueId: string;
  currentDescription: string | null;
  packages: VenuePackageOption[];
  initialDrafts: Record<string, GeneratedContent>;
}

export default function DescriptionGeneratorPanel({
  venueId,
  currentDescription,
  packages,
  initialDrafts,
}: DescriptionGeneratorPanelProps) {
  const [contentType, setContentType] =
    useState<(typeof generatedContentTypeOptions)[number]>("description");
  const [tone, setTone] =
    useState<(typeof generatedContentToneOptions)[number]>("elegant");
  const [packageId, setPackageId] = useState<string>(packages[0]?.id ?? "");
  const [drafts, setDrafts] = useState(initialDrafts);
  const [decisionState, setDecisionState] = useState<
    "idle" | "pending" | "error"
  >("idle");
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const { mutate, isPending, error, reset } = useGenerateVenueDescription();
  const activeDraft = drafts[contentType] ?? null;

  function handleGenerate() {
    setDecisionError(null);
    mutate(
      {
        venueId,
        contentType,
        packageId:
          contentType === "package_description" ? packageId || null : null,
        tone,
      },
      {
        onSuccess: (result) => {
          setDrafts((prev) => ({ ...prev, [contentType]: result.content }));
        },
      },
    );
  }

  async function handleApprove() {
    if (!activeDraft) return;
    setDecisionState("pending");
    setDecisionError(null);

    const result = await approveGeneratedContentAction({
      contentId: activeDraft.id,
    });

    if (result.error) {
      setDecisionState("error");
      setDecisionError(result.error.message);
      return;
    }

    setDrafts((prev) => ({
      ...prev,
      [contentType]: { ...activeDraft, status: "approved" },
    }));
    setDecisionState("idle");
  }

  async function handleReject() {
    if (!activeDraft) return;
    setDecisionState("pending");
    setDecisionError(null);

    const result = await rejectGeneratedContentAction({
      contentId: activeDraft.id,
    });

    if (result.error) {
      setDecisionState("error");
      setDecisionError(result.error.message);
      return;
    }

    setDrafts((prev) => ({
      ...prev,
      [contentType]: { ...activeDraft, status: "rejected" },
    }));
    setDecisionState("idle");
  }

  const selectClass =
    "h-11 w-full rounded-xl border border-[#e5e7eb] bg-white px-3 text-sm text-[#111827] outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#eff6ff]";

  return (
    <Panel>
      <PanelHeader
        title="AI Description Generator"
        description="Generate marketing copy from your venue's structured facts, then review before it goes live."
      />

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
              Content type
            </label>
            <select
              value={contentType}
              onChange={(event) => {
                setContentType(event.target.value as typeof contentType);
                reset();
                setDecisionError(null);
              }}
              className={selectClass}
            >
              {generatedContentTypeOptions.map((option) => (
                <option key={option} value={option}>
                  {contentTypeLabels[option]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
              Tone
            </label>
            <select
              value={tone}
              onChange={(event) => setTone(event.target.value as typeof tone)}
              className={selectClass}
            >
              {generatedContentToneOptions.map((option) => (
                <option key={option} value={option} className="capitalize">
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        {contentType === "package_description" && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
              Package
            </label>
            {packages.length === 0 ? (
              <p className="text-xs text-[#9ca3af]">
                Add a package to this venue before generating package copy.
              </p>
            ) : (
              <select
                value={packageId}
                onChange={(event) => setPackageId(event.target.value)}
                className={selectClass}
              >
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={
            isPending ||
            (contentType === "package_description" && packages.length === 0)
          }
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#1d4ed8] text-sm font-bold text-white transition hover:bg-[#1e40af] disabled:opacity-60"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Draft
            </>
          )}
        </button>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs font-medium text-red-700">
            {error.message}
          </div>
        )}
        {decisionError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs font-medium text-red-700">
            {decisionError}
          </div>
        )}

        {contentType === "description" && currentDescription && (
          <div className="rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-3.5">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#9ca3af]">
              Current description
            </p>
            <p className="line-clamp-4 text-xs leading-relaxed text-[#4b5563]">
              {currentDescription}
            </p>
          </div>
        )}

        {activeDraft ? (
          <div className="space-y-3 rounded-xl border border-[#dbeafe] bg-[#eff6ff] p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#2563eb]">
                {activeDraft.status === "draft"
                  ? "Draft — pending review"
                  : activeDraft.status === "approved"
                    ? "Approved"
                    : "Rejected"}
              </span>
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-[#111827]">
              {activeDraft.generatedText}
            </p>

            {activeDraft.status === "draft" && (
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={decisionState === "pending"}
                  className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  <Check className="h-3.5 w-3.5" />
                  Approve
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isPending}
                  className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-white text-xs font-bold text-[#111827] hover:bg-[#f9fafb] disabled:opacity-60"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={decisionState === "pending"}
                  className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  <X className="h-3.5 w-3.5" />
                  Reject
                </button>
              </div>
            )}
          </div>
        ) : (
          !isPending && (
            <div className="rounded-xl border border-dashed border-[#e5e7eb] p-5 text-center text-xs font-medium text-[#9ca3af]">
              No AI draft yet for this content type. Generate one above.
            </div>
          )
        )}
      </div>
    </Panel>
  );
}
