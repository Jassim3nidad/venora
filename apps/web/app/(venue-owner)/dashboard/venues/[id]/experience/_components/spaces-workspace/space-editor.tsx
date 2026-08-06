"use client";

import { useState, type FormEvent } from "react";
import { cn } from "@venora/lib";
import { SpaceBasicsForm } from "./space-basics-form";
import { SpaceCapacityEditor } from "./space-capacity-editor";
import { AmenitySelector } from "./amenity-selector";
import { EventTypeSelector } from "./event-type-selector";
import type { VenueSpace } from "@/src/features/venues/domain/structured-venue.types";
import type { CapacityLayoutRow, SpaceAmenityRow, SpaceEventTypeRow } from "./types";
import type { Amenity } from "./amenity-selector";
import type { EventType } from "./event-type-selector";

type Tab = "basics" | "capacity" | "amenities" | "events";

const TABS: { id: Tab; label: string }[] = [
  { id: "basics", label: "Basics & Policies" },
  { id: "capacity", label: "Seating & Capacity" },
  { id: "amenities", label: "Amenities" },
  { id: "events", label: "Event Fit" },
];

type Props = {
  space: VenueSpace | null;
  isAdding: boolean;
  capacityLayouts: CapacityLayoutRow[];
  spaceAmenities: SpaceAmenityRow[];
  spaceEventTypes: SpaceEventTypeRow[];
  amenities: Amenity[];
  eventTypes: EventType[];
  onSaveSpace: (event: FormEvent<HTMLFormElement>) => void;
  onSaveCapacity: (event: FormEvent<HTMLFormElement>) => void;
  onSaveAmenities: (event: FormEvent<HTMLFormElement>) => void;
  onSaveEventTypes: (event: FormEvent<HTMLFormElement>) => void;
};

export function SpaceEditor({
  space,
  isAdding,
  capacityLayouts,
  spaceAmenities,
  spaceEventTypes,
  amenities,
  eventTypes,
  onSaveSpace,
  onSaveCapacity,
  onSaveAmenities,
  onSaveEventTypes,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("basics");

  if (isAdding) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-[#0f172a]">Add new space</h3>
          <p className="mt-1 text-sm text-[#64748b]">
            Start with the basic details. You can add capacity layouts and amenities after saving.
          </p>
        </div>
        <SpaceBasicsForm space={null} onSubmit={onSaveSpace} />
      </div>
    );
  }

  if (!space) return null;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-[#0f172a]">{space.name || "Edit space"}</h3>
        <p className="mt-1 text-sm text-[#64748b]">
          Manage details and settings for this space.
        </p>
      </div>

      <div className="mb-6 flex gap-1 border-b border-[#dbe3ef] overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-bold whitespace-nowrap border-b-2 transition-colors",
              activeTab === tab.id
                ? "border-[#1d4ed8] text-[#1d4ed8]"
                : "border-transparent text-[#64748b] hover:text-[#0f172a]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {activeTab === "basics" && (
          <SpaceBasicsForm space={space} onSubmit={onSaveSpace} />
        )}
        
        {activeTab === "capacity" && (
          <SpaceCapacityEditor
            space={space}
            layouts={capacityLayouts.filter((l) => l.space_id === space.id)}
            onSubmit={onSaveCapacity}
          />
        )}

        {activeTab === "amenities" && (
          <AmenitySelector
            space={space}
            amenities={amenities}
            spaceAmenities={spaceAmenities.filter((sa) => sa.space_id === space.id)}
            onSubmit={onSaveAmenities}
          />
        )}

        {activeTab === "events" && (
          <EventTypeSelector
            space={space}
            eventTypes={eventTypes}
            spaceEventTypes={spaceEventTypes.filter((se) => se.space_id === space.id)}
            onSubmit={onSaveEventTypes}
          />
        )}
      </div>
    </div>
  );
}
