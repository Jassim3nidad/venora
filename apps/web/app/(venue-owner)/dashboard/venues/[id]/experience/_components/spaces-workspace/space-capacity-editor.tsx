"use client";

import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";
import { SubmitButton } from "../submit-button";
import { 
  VENUE_SPACE_LAYOUTS,
  getVenueSpaceLayoutLabel,
  type VenueSpace, 
  type VenueSpaceLayout
} from "@/src/features/venues/domain/structured-venue.types";
import type { CapacityLayoutRow } from "./types";
import { cn } from "@venora/lib";

const inputClass = "w-full rounded-lg border border-[#dbe3ef] bg-[#f8fbff] px-3 py-2 text-sm text-[#0f172a] shadow-sm outline-none transition focus:border-[#93c5fd] focus:bg-white focus:ring-4 focus:ring-blue-50";

type Props = {
  space: VenueSpace;
  layouts: CapacityLayoutRow[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function SpaceCapacityEditor({ space, layouts: initialLayouts, onSubmit }: Props) {
  // We keep track of rows client-side so they can add/remove them dynamically
  const [rows, setRows] = useState<any[]>(
    initialLayouts.length > 0 
      ? initialLayouts 
      : [{ layout: "", custom_layout_label: "", capacity: "", notes: "" }]
  );

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-[#dbe3ef] bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-[#334155]">Capacity layouts</h4>
          <p className="text-sm text-[#64748b]">Configure different seating styles and their maximum capacities.</p>
        </div>
        <button
          type="button"
          onClick={() => setRows([...rows, { layout: "", custom_layout_label: "", capacity: "", notes: "" } as any])}
          className="inline-flex items-center gap-2 rounded-lg border border-[#dbe3ef] bg-white px-3 py-1.5 text-sm font-bold text-[#1d4ed8] transition hover:border-[#93c5fd] hover:bg-[#eff6ff]"
        >
          <Plus className="h-4 w-4" />
          Add layout
        </button>
      </div>

      <div className="space-y-4">
        {rows.map((layout, index) => (
          <div key={index} className="grid gap-3 rounded-lg border border-[#e5e7eb] bg-[#f8fafc] p-4 lg:grid-cols-[minmax(160px,0.8fr)_minmax(180px,1fr)_140px_auto]">
            <select name={`layout-${index}`} defaultValue={layout?.layout ?? ""} required className={inputClass}>
              <option value="">Select layout style</option>
              {VENUE_SPACE_LAYOUTS.map((value: VenueSpaceLayout) => (
                <option key={value} value={value}>{getVenueSpaceLayoutLabel(value)}</option>
              ))}
            </select>
            <input name={`customLayoutLabel-${index}`} defaultValue={layout?.custom_layout_label ?? ""} placeholder="Custom label (optional)" className={inputClass} />
            <input name={`layoutCapacity-${index}`} type="number" min="1" required defaultValue={layout?.capacity ?? ""} placeholder="Capacity" className={inputClass} />
            <button
              type="button"
              onClick={() => {
                const next = [...rows];
                next.splice(index, 1);
                setRows(next);
              }}
              className="flex h-[38px] w-[38px] items-center justify-center rounded-lg border border-[#dbe3ef] text-[#475569] hover:bg-white hover:text-red-600 transition"
              title="Remove layout"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <input name={`layoutNotes-${index}`} defaultValue={layout?.notes ?? ""} placeholder="Notes (e.g., 'Includes dance floor space')" className={cn(inputClass, "lg:col-span-4")} />
          </div>
        ))}
        {rows.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#cbd5e1] p-5 text-center text-sm text-[#64748b]">
            No seating layouts configured. Add one to show customers how this space can be used.
          </div>
        )}
      </div>
      
      {/* Hidden input to tell the backend how many layouts we are sending */}
      <input type="hidden" name="layoutCount" value={rows.length} />

      <div className="mt-8 flex justify-end">
        <SubmitButton label="Save capacity & seating" />
      </div>
    </form>
  );
}
