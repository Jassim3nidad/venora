"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { cn } from "@venora/lib";
import { getVenueSpaceSettingLabel } from "@/src/features/venues/domain/structured-venue.types";
import type { VenueSpace } from "@/src/features/venues/domain/structured-venue.types";

type Props = {
  spaces: VenueSpace[];
  selectedSpaceId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onReorder: (id: string, direction: "up" | "down") => void;
  onArchive: (space: VenueSpace) => void;
};

export function SpaceList({
  spaces,
  selectedSpaceId,
  onSelect,
  onAdd,
  onReorder,
  onArchive,
}: Props) {
  return (
    <div className="flex w-full shrink-0 flex-col gap-3 xl:w-[320px]">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-[#0f172a]">Spaces</h2>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#eff6ff] text-[#1d4ed8] hover:bg-[#dbeafe]"
          aria-label="Add Space"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {spaces.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-5 text-sm leading-6 text-[#64748b]">
          No spaces yet. Add a ballroom, garden, pavilion, ceremony area, reception area, or preparation suite.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {spaces.map((space, index) => {
            const isSelected = selectedSpaceId === space.id;
            return (
              <div
                key={space.id}
                className={cn(
                  "rounded-xl border p-4 transition-colors",
                  isSelected
                    ? "border-[#93c5fd] bg-[#eff6ff]"
                    : "border-[#dbe3ef] bg-white hover:border-[#cbd5e1]"
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(space.id)}
                  className="w-full text-left outline-none"
                >
                  <p className="text-base font-bold text-[#0f172a]">{space.name || "Untitled space"}</p>
                  <p className="mt-1 text-sm font-semibold text-[#64748b]">
                    {space.setting ? getVenueSpaceSettingLabel(space.setting) : "Unknown setting"} 
                    {space.capacityMax ? ` · up to ${space.capacityMax} guests` : ""}
                  </p>
                </button>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onReorder(space.id, "up")}
                    disabled={index === 0}
                    className="rounded-md border border-[#dbe3ef] p-1.5 text-[#475569] hover:bg-white disabled:opacity-40"
                    aria-label={`Move ${space.name} up`}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onReorder(space.id, "down")}
                    disabled={index === spaces.length - 1}
                    className="rounded-md border border-[#dbe3ef] p-1.5 text-[#475569] hover:bg-white disabled:opacity-40"
                    aria-label={`Move ${space.name} down`}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onArchive(space)}
                    className="ml-auto rounded-md border border-red-200 bg-red-50 p-1.5 text-red-700 hover:bg-red-100"
                    aria-label={`Archive ${space.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
