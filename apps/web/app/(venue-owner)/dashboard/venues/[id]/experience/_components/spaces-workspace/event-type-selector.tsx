"use client";

import { type FormEvent } from "react";
import { SubmitButton } from "../submit-button";
import type { VenueSpace } from "@/src/features/venues/domain/structured-venue.types";
import type { SpaceEventTypeRow } from "./types";

export type EventType = { id: string; name: string };

type Props = {
  space: VenueSpace;
  eventTypes: EventType[];
  spaceEventTypes: SpaceEventTypeRow[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function EventTypeSelector({ space, eventTypes, spaceEventTypes, onSubmit }: Props) {
  const selectedIds = new Set(spaceEventTypes.map((se) => se.event_type_id));

  // Group event types by category heuristics for easier scanning
  const grouped = eventTypes.reduce((acc, eventType) => {
    const name = eventType.name.toLowerCase();
    let group = "Other Events";
    if (name.includes("wedding") || name.includes("ceremony") || name.includes("reception")) {
      group = "Weddings & Nuptials";
    } else if (name.includes("corporate") || name.includes("meeting") || name.includes("conference") || name.includes("seminar")) {
      group = "Corporate & Meetings";
    } else if (name.includes("party") || name.includes("birthday") || name.includes("celebration")) {
      group = "Parties & Celebrations";
    }

    if (!acc[group]) acc[group] = [];
    acc[group]!.push(eventType);
    return acc;
  }, {} as Record<string, EventType[]>);

  const groups = Object.keys(grouped).sort();

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-[#dbe3ef] bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h4 className="text-sm font-bold text-[#334155]">Supported event types</h4>
        <p className="mt-1 text-sm text-[#64748b]">Select the types of events that are a great fit for {space.name}.</p>
      </div>

      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group}>
            <h5 className="mb-3 text-xs font-bold uppercase tracking-wider text-[#94a3b8]">{group}</h5>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(grouped[group] || []).map((item) => (
                <label
                  key={item.id}
                  className="flex min-w-0 min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-[#dbe3ef] bg-[#f8fbff] px-4 py-3 text-sm font-semibold text-[#334155] transition hover:border-[#cbd5e1] has-[:checked]:border-[#93c5fd] has-[:checked]:bg-[#eff6ff] has-[:checked]:text-[#1d4ed8]"
                >
                  <input
                    type="checkbox"
                    name="eventTypeIds"
                    value={item.id}
                    defaultChecked={selectedIds.has(item.id)}
                    className="h-4 w-4 shrink-0 rounded border-[#cbd5e1] text-[#1d4ed8] focus:ring-[#93c5fd]"
                  />
                  <span className="flex-1 min-w-0 break-words leading-tight">{item.name}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
        {eventTypes.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#cbd5e1] p-5 text-center text-sm text-[#64748b]">
            No event types found in the system.
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-end">
        <SubmitButton label="Save event types" />
      </div>
    </form>
  );
}
