"use client";

import { type FormEvent, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Panel } from "@/components/dashboard/enterprise";
import { SectionTitle } from "../section-title";
import { SubmitButton } from "../submit-button";
import type { DraftStructuredVenueProfile } from "@/src/features/venues/domain/structured-venue.types";
import { cn } from "@venora/lib";

const inputClass = "w-full rounded-lg border border-[#dbe3ef] bg-[#f8fbff] px-3 py-2 text-sm text-[#0f172a] shadow-sm outline-none transition focus:border-[#93c5fd] focus:bg-white focus:ring-4 focus:ring-blue-50";
const textareaClass = "w-full rounded-lg border border-[#dbe3ef] bg-[#f8fbff] px-3 py-2 text-sm text-[#0f172a] shadow-sm outline-none transition focus:border-[#93c5fd] focus:bg-white focus:ring-4 focus:ring-blue-50";

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="mb-1.5 text-sm font-bold text-[#334155]">{label}</p>
      {children}
    </div>
  );
}

function LogisticsGroup({ title, description, children, defaultOpen = false }: { title: string; description: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className={cn("overflow-hidden rounded-xl border border-[#dbe3ef] bg-white shadow-sm transition-all", isOpen ? "ring-1 ring-[#93c5fd]" : "")}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-5 text-left hover:bg-[#f8fbff]"
      >
        <div>
          <h3 className="text-base font-bold text-[#0f172a]">{title}</h3>
          <p className="mt-1 text-sm text-[#64748b]">{description}</p>
        </div>
        <ChevronDown className={cn("h-5 w-5 text-[#94a3b8] transition-transform", isOpen ? "rotate-180" : "")} />
      </button>
      {isOpen && (
        <div className="border-t border-[#dbe3ef] bg-[#f8fbff] p-5">
          <div className="grid gap-5 sm:grid-cols-2">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

export function LogisticsWorkspace({
  profile,
  onSave,
}: {
  profile: DraftStructuredVenueProfile;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const logistics = profile.logistics;
  
  return (
    <Panel>
      <SectionTitle
        title="Logistics"
        description="Give customers the practical information they need before booking."
      />
      <form onSubmit={onSave} className="space-y-4">
        
        <LogisticsGroup 
          title="Arrival & Parking" 
          description="How guests will get to and park at the venue."
          defaultOpen={true}
        >
          <Field label="Arrival directions" className="sm:col-span-2">
            <textarea name="arrivalNotes" rows={3} defaultValue={logistics?.arrivalNotes ?? ""} className={textareaClass} placeholder="Turn-by-turn directions, entrance locations..." />
          </Field>
          <Field label="Public transportation" className="sm:col-span-2">
            <textarea name="publicTransportationNotes" rows={2} defaultValue={logistics?.publicTransportationNotes ?? ""} className={textareaClass} placeholder="Nearest train stations, bus stops, ride-share drop-off..." />
          </Field>
          <Field label="Parking capacity">
            <input name="parkingCapacity" type="number" min="0" defaultValue={logistics?.parkingCapacity ?? ""} className={inputClass} placeholder="e.g. 50" />
          </Field>
          <Field label="Parking notes">
            <textarea name="parkingNotes" rows={3} defaultValue={logistics?.parkingNotes ?? ""} className={textareaClass} placeholder="Valet, street parking, permits required..." />
          </Field>
        </LogisticsGroup>

        <LogisticsGroup 
          title="Accessibility" 
          description="Information for guests with disabilities."
        >
          <Field label="Accessibility notes" className="sm:col-span-2">
            <textarea name="accessibilityNotes" rows={3} defaultValue={logistics?.accessibilityNotes ?? ""} className={textareaClass} placeholder="Wheelchair access, ramps, elevators, accessible restrooms..." />
          </Field>
        </LogisticsGroup>

        <LogisticsGroup 
          title="Event Operations" 
          description="Rules and procedures for vendors and setup."
        >
          <Field label="Setup rules" className="sm:col-span-2">
            <textarea name="setupRules" rows={3} defaultValue={logistics?.setupRules ?? ""} className={textareaClass} placeholder="When vendors can arrive, loading dock access..." />
          </Field>
          <Field label="Teardown rules" className="sm:col-span-2">
            <textarea name="teardownRules" rows={3} defaultValue={logistics?.teardownRules ?? ""} className={textareaClass} placeholder="Cleanup requirements, trash removal..." />
          </Field>
          <Field label="External supplier rules" className="sm:col-span-2">
            <textarea name="externalSupplierRules" rows={3} defaultValue={logistics?.externalSupplierRules ?? ""} className={textareaClass} placeholder="Are outside caterers allowed? Insurance requirements..." />
          </Field>
        </LogisticsGroup>

        <LogisticsGroup 
          title="Venue Policies" 
          description="Rules for noise, pets, and timing."
        >
          <Field label="Curfew time">
            <input name="curfewTime" type="time" defaultValue={logistics?.curfewTime ?? ""} className={inputClass} />
          </Field>
          <Field label="Noise restrictions">
            <textarea name="noiseRestrictions" rows={2} defaultValue={logistics?.noiseRestrictions ?? ""} className={textareaClass} placeholder="Decibel limits, amplified music cutoff..." />
          </Field>
          <Field label="Pet policy">
            <textarea name="petPolicy" rows={2} defaultValue={logistics?.petPolicy ?? ""} className={textareaClass} placeholder="Are pets allowed? Service animals only?" />
          </Field>
          <Field label="Smoking policy">
            <textarea name="smokingPolicy" rows={2} defaultValue={logistics?.smokingPolicy ?? ""} className={textareaClass} placeholder="Designated smoking areas, vape policy..." />
          </Field>
          <Field label="Other practical notes" className="sm:col-span-2">
            <textarea name="otherNotes" rows={3} defaultValue={logistics?.otherNotes ?? ""} className={textareaClass} placeholder="Any other important policies..." />
          </Field>
        </LogisticsGroup>

        <LogisticsGroup 
          title="Weather Planning" 
          description="Contingency plans for outdoor spaces."
        >
          <Field label="Weather backup area" className="sm:col-span-2">
            <label className="mb-3 flex items-center gap-3 text-sm font-bold text-[#334155]">
              <input name="weatherBackupAvailable" type="checkbox" defaultChecked={Boolean(logistics?.weatherBackupAvailable)} className="h-4 w-4 rounded border-[#cbd5e1] text-[#1d4ed8] focus:ring-[#93c5fd]" />
              Indoor backup area available
            </label>
            <textarea name="weatherBackupNotes" rows={3} defaultValue={logistics?.weatherBackupNotes ?? ""} className={textareaClass} placeholder="Describe the backup plan and when the call must be made..." />
          </Field>
        </LogisticsGroup>

        <div className="pt-6">
          <SubmitButton label="Save logistics" />
        </div>
      </form>
    </Panel>
  );
}
