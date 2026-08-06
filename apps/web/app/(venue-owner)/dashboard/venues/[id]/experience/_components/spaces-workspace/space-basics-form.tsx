"use client";

import { type FormEvent } from "react";
import { SubmitButton } from "../submit-button";
import { 
  VENUE_SPACE_TYPES, 
  VENUE_SPACE_SETTINGS,
  getVenueSpaceTypeLabel, 
  getVenueSpaceSettingLabel,
  type VenueSpace,
  type VenueSpaceType,
  type VenueSpaceSetting
} from "@/src/features/venues/domain/structured-venue.types";
import { cn } from "@venora/lib";

const inputClass = "w-full rounded-lg border border-[#dbe3ef] bg-[#f8fbff] px-3 py-2 text-sm text-[#0f172a] shadow-sm outline-none transition focus:border-[#93c5fd] focus:bg-white focus:ring-4 focus:ring-blue-50";
const textareaClass = "w-full rounded-lg border border-[#dbe3ef] bg-[#f8fbff] px-3 py-2 text-sm text-[#0f172a] shadow-sm outline-none transition focus:border-[#93c5fd] focus:bg-white focus:ring-4 focus:ring-blue-50";
const labelClass = "text-sm font-bold text-[#334155]";

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className={labelClass}>{label}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

type Props = {
  space: VenueSpace | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function SpaceBasicsForm({ space, onSubmit }: Props) {
  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-[#dbe3ef] bg-white p-6 shadow-sm">
      <div className="grid gap-5 lg:grid-cols-2">
        <Field label="Name">
          <input name="name" required defaultValue={space?.name ?? ""} className={inputClass} placeholder="e.g. The Grand Ballroom" />
        </Field>
        <Field label="Slug">
          <input name="slug" defaultValue={space?.slug ?? ""} placeholder="the-grand-ballroom" className={inputClass} />
        </Field>
        
        <Field label="Space type">
          <select name="spaceType" defaultValue={space?.spaceType ?? ""} className={inputClass}>
            <option value="">Choose a type</option>
            {VENUE_SPACE_TYPES.map((value: VenueSpaceType) => (
              <option key={value} value={value}>{getVenueSpaceTypeLabel(value)}</option>
            ))}
          </select>
        </Field>
        <Field label="Setting">
          <select name="setting" defaultValue={space?.setting ?? "indoor"} className={inputClass}>
            {VENUE_SPACE_SETTINGS.map((value: VenueSpaceSetting) => (
              <option key={value} value={value}>{getVenueSpaceSettingLabel(value)}</option>
            ))}
          </select>
        </Field>

        <Field label="Minimum capacity">
          <input name="capacityMin" type="number" min="0" defaultValue={space?.capacityMin ?? ""} className={inputClass} placeholder="Optional" />
        </Field>
        <Field label="Maximum capacity">
          <input name="capacityMax" type="number" min="1" required defaultValue={space?.capacityMax ?? ""} className={inputClass} placeholder="e.g. 150" />
        </Field>

        <Field label="Short description" className="sm:col-span-2">
          <input name="shortDescription" defaultValue={space?.shortDescription ?? ""} className={inputClass} placeholder="A one-sentence summary for preview cards." />
        </Field>
        
        <Field label="Full description" className="sm:col-span-2">
          <textarea name="description" rows={4} defaultValue={space?.description ?? ""} className={textareaClass} placeholder="Describe the atmosphere, design, and unique features." />
        </Field>
        
        <Field label="Accessibility summary" className="sm:col-span-2">
          <textarea name="accessibilitySummary" rows={2} defaultValue={space?.accessibilitySummary ?? ""} className={textareaClass} placeholder="e.g. Ramp access available, elevator nearby." />
        </Field>
        
        <Field label="Restrictions" className="sm:col-span-2 lg:col-span-1">
          <textarea name="restrictions" rows={3} defaultValue={space?.restrictions ?? ""} className={textareaClass} placeholder="e.g. No open flames, no confetti." />
        </Field>
        
        <Field label="Operating notes" className="sm:col-span-2 lg:col-span-1">
          <textarea name="operatingNotes" rows={3} defaultValue={space?.operatingNotes ?? ""} className={textareaClass} placeholder="e.g. AC turns off automatically at midnight." />
        </Field>
      </div>

      <div className="mt-8 flex justify-end">
        <SubmitButton label={space ? "Save basic details" : "Add space"} />
      </div>
    </form>
  );
}
