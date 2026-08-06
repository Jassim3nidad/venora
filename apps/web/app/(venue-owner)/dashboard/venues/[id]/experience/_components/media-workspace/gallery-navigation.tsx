import React from "react";
import { Plus, Image as ImageIcon } from "lucide-react";
import { type VenueMediaCollection, getVenueMediaCollectionTypeLabel } from "@/src/features/venues/domain/structured-venue.types";

interface GalleryNavigationProps {
  collections: VenueMediaCollection[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateNew: () => void;
  itemsCountMap: Record<string, number>;
}

export function GalleryNavigation({
  collections,
  selectedId,
  onSelect,
  onCreateNew,
  itemsCountMap,
}: GalleryNavigationProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[#dbe3ef] bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-[#0f172a]">Galleries</h3>
      </div>
      
      {collections.length === 0 ? (
        <div className="py-4 text-center text-sm text-[#64748b]">
          No galleries yet
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {collections.map((collection) => {
            const isSelected = selectedId === collection.id;
            const count = itemsCountMap[collection.id] || 0;
            return (
              <button
                key={collection.id}
                onClick={() => onSelect(collection.id)}
                className={`flex w-full items-start justify-between rounded-lg px-3 py-2 text-left transition-colors ${
                  isSelected
                    ? "bg-[#eff6ff] text-[#1d4ed8]"
                    : "text-[#475569] hover:bg-[#f8fafc] hover:text-[#0f172a]"
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold leading-5">
                    {collection.title || getVenueMediaCollectionTypeLabel(collection.collectionType)}
                  </span>
                  <span className="text-xs leading-4 opacity-75">
                    {count} image{count !== 1 && "s"} {collection.isCover && "· Cover"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={onCreateNew}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#cbd5e1] py-2 text-sm font-bold text-[#475569] transition hover:border-[#94a3b8] hover:bg-[#f8fafc] hover:text-[#0f172a]"
      >
        <Plus className="h-4 w-4" />
        New gallery
      </button>
    </div>
  );
}
