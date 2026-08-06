"use client";

import { CheckCircle2, ChevronDown, Circle, AlertCircle, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@venora/lib";
import {
  ProfileSectionId,
  ProfileSectionStatus,
  STRUCTURED_EDITOR_SECTIONS,
} from "@/src/features/venues/utils/structured-editor";
import { Panel } from "@/components/dashboard/enterprise";

type Props = {
  currentSection: ProfileSectionId;
  onSectionChange: (section: ProfileSectionId) => void;
  statuses: Record<ProfileSectionId, ProfileSectionStatus>;
};

function StatusIcon({ state }: { state: ProfileSectionStatus["completionState"] }) {
  if (state === "complete") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  }
  if (state === "needs_attention" || state === "blocked") {
    return <AlertCircle className="h-4 w-4 text-red-600" />;
  }
  if (state === "in_progress") {
    return <div className="h-4 w-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />;
  }
  return <Circle className="h-4 w-4 text-[#cbd5e1]" />;
}

export function ProfileSectionNavigation({ currentSection, onSectionChange, statuses }: Props) {
  const currentIndex = STRUCTURED_EDITOR_SECTIONS.findIndex((s) => s.id === currentSection);
  const prevSection = STRUCTURED_EDITOR_SECTIONS[currentIndex - 1];
  const nextSection = STRUCTURED_EDITOR_SECTIONS[currentIndex + 1];

  return (
    <>
      {/* Desktop Navigation */}
      <Panel className="hidden h-max 2xl:block sticky top-[100px]">
        <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
          Profile progress
        </p>
        <nav className="mt-4 flex flex-col gap-1" aria-label="Structured editor sections">
          {STRUCTURED_EDITOR_SECTIONS.map((item) => {
            const status = statuses[item.id];
            const isActive = currentSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSectionChange(item.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition",
                  isActive
                    ? "bg-[#eff6ff] ring-1 ring-[#93c5fd]"
                    : "hover:bg-[#f8fbff]"
                )}
              >
                <div className="mt-0.5">
                  <StatusIcon state={status.completionState} />
                </div>
                <div>
                  <p
                    className={cn(
                      "text-sm font-bold",
                      isActive ? "text-[#1d4ed8]" : "text-[#334155]"
                    )}
                  >
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-[#64748b]">
                    {status.summary || status.requirementLevel}
                  </p>
                </div>
              </button>
            );
          })}
        </nav>
      </Panel>

      {/* Mobile / Tablet Navigation */}
      <div className="2xl:hidden flex flex-col gap-3 rounded-xl border border-[#dbe3ef] bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#64748b]">
              Current Section
            </p>
            <div className="mt-1 flex items-center gap-2">
              <StatusIcon state={statuses[currentSection].completionState} />
              <select
                value={currentSection}
                onChange={(e) => onSectionChange(e.target.value as ProfileSectionId)}
                className="appearance-none bg-transparent text-lg font-bold text-[#0f172a] outline-none"
              >
                {STRUCTURED_EDITOR_SECTIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-4 w-4 text-[#64748b] pointer-events-none -ml-1" />
            </div>
            <p className="mt-1 text-sm font-medium text-[#64748b]">
              {statuses[currentSection].summary || statuses[currentSection].requirementLevel}
            </p>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 border-t border-[#f1f5f9] pt-3">
          <button
            type="button"
            onClick={() => prevSection && onSectionChange(prevSection.id)}
            disabled={!prevSection}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#475569] hover:text-[#1d4ed8] disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>
          <button
            type="button"
            onClick={() => nextSection && onSectionChange(nextSection.id)}
            disabled={!nextSection}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#475569] hover:text-[#1d4ed8] disabled:opacity-40"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}
