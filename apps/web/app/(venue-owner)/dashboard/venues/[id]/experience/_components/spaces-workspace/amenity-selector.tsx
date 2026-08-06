"use client";

import { type FormEvent } from "react";
import { SubmitButton } from "../submit-button";
import type { VenueSpace } from "@/src/features/venues/domain/structured-venue.types";
import type { SpaceAmenityRow } from "./types";

export type Amenity = { id: string; name: string };

type Props = {
  space: VenueSpace;
  amenities: Amenity[];
  spaceAmenities: SpaceAmenityRow[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function AmenitySelector({ space, amenities, spaceAmenities, onSubmit }: Props) {
  const selectedIds = new Set(spaceAmenities.map((sa) => sa.amenity_id));

  // Deduplicate amenities (e.g., "WiFi" and "Wi-Fi") based on alphanumeric normalized names.
  // We prefer to keep the specific ID that the user has already selected, if any.
  const normMap = new Map<string, Amenity>();
  amenities.forEach((a) => {
    const norm = a.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!normMap.has(norm)) {
      normMap.set(norm, a);
    } else if (selectedIds.has(a.id) && !selectedIds.has(normMap.get(norm)!.id)) {
      normMap.set(norm, a);
    }
  });
  const uniqueAmenities = Array.from(normMap.values());

  // Group amenities by first letter for easier scanning, or by keywords if desired
  const grouped = uniqueAmenities.reduce((acc, amenity) => {
    // Simple alphabetic grouping
    const group = amenity.name.charAt(0).toUpperCase() || "Other";
    if (!acc[group]) acc[group] = [];
    acc[group]!.push(amenity);
    return acc;
  }, {} as Record<string, Amenity[]>);

  const groups = Object.keys(grouped).sort();

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-[#dbe3ef] bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h4 className="text-sm font-bold text-[#334155]">Space-specific amenities</h4>
        <p className="mt-1 text-sm text-[#64748b]">Select the amenities available specifically in {space.name}.</p>
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
                    name="amenityIds"
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
        {amenities.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#cbd5e1] p-5 text-center text-sm text-[#64748b]">
            No amenities found in the system.
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-end">
        <SubmitButton label="Save amenities" />
      </div>
    </form>
  );
}
