"use client";

import { useState, type FormEvent } from "react";
import { SectionTitle } from "../section-title";
import { Panel } from "@/components/dashboard/enterprise";
import { SpaceList } from "./space-list";
import { SpaceEditor } from "./space-editor";
import type { VenueSpace } from "@/src/features/venues/domain/structured-venue.types";
import type { CapacityLayoutRow, SpaceAmenityRow, SpaceEventTypeRow } from "./types";
import type { Amenity } from "./amenity-selector";
import type { EventType } from "./event-type-selector";

type Props = {
  spaces: VenueSpace[];
  selectedSpaceId: string;
  setSelectedSpaceId: (value: string) => void;
  capacityLayouts: CapacityLayoutRow[];
  spaceAmenities: SpaceAmenityRow[];
  spaceEventTypes: SpaceEventTypeRow[];
  amenities: Amenity[];
  eventTypes: EventType[];
  onSaveSpace: (event: FormEvent<HTMLFormElement>) => void;
  onSaveCapacity: (event: FormEvent<HTMLFormElement>) => void;
  onSaveAmenities: (event: FormEvent<HTMLFormElement>) => void;
  onSaveEventTypes: (event: FormEvent<HTMLFormElement>) => void;
  onReorder: (spaceId: string, direction: "up" | "down") => void;
  onArchive: (space: VenueSpace) => void;
};

export function SpacesWorkspace({
  spaces,
  selectedSpaceId,
  setSelectedSpaceId,
  capacityLayouts,
  spaceAmenities,
  spaceEventTypes,
  amenities,
  eventTypes,
  onSaveSpace,
  onSaveCapacity,
  onSaveAmenities,
  onSaveEventTypes,
  onReorder,
  onArchive,
}: Props) {
  const selectedSpace = spaces.find((s) => s.id === selectedSpaceId) ?? null;
  const isAdding = selectedSpaceId === "" || (!selectedSpace && spaces.length === 0);

  return (
    <Panel>
      <SectionTitle
        title="Spaces"
        description="Create customer-readable spaces such as ballrooms, gardens, ceremony areas, and preparation suites."
      />
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        {/* Master List */}
        <div className="border-r border-[#dbe3ef] bg-[#f8fbff] p-5 xl:w-[360px] shrink-0">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#0f172a]">Spaces</h2>
            <p className="mt-1 text-sm text-[#64748b]">
              Manage the areas your customers can book.
            </p>
          </div>
          
          <SpaceList
            spaces={spaces}
            selectedSpaceId={selectedSpaceId}
            onSelect={setSelectedSpaceId}
            onAdd={() => setSelectedSpaceId("")}
            onReorder={onReorder}
            onArchive={onArchive}
          />
        </div>

        {/* Detail Editor */}
        <div className="flex-1 bg-white p-5 xl:p-8">
          <SpaceEditor
            key={selectedSpaceId || "new-space"}
            space={selectedSpace}
            isAdding={isAdding}
            capacityLayouts={capacityLayouts}
            spaceAmenities={spaceAmenities}
            spaceEventTypes={spaceEventTypes}
            amenities={amenities}
            eventTypes={eventTypes}
            onSaveSpace={onSaveSpace}
            onSaveCapacity={onSaveCapacity}
            onSaveAmenities={onSaveAmenities}
            onSaveEventTypes={onSaveEventTypes}
          />
        </div>
      </div>
    </Panel>
  );
}
