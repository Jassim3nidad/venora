import React, { useState, useMemo } from "react";
import Image from "next/image";
import { Check, Search, X } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogClose, Button } from "@venora/ui";
import type { VenueImage } from "../../structured-venue-editor-client";
import { getVenueMediaUrl } from "@/src/features/venues/utils/venue-media";
import type { VenueMediaItem } from "@/src/features/venues/domain/structured-venue.types";

interface ExistingAssetPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueImages: VenueImage[];
  existingItems: VenueMediaItem[];
  onAssign: (images: VenueImage[]) => void;
}

export function ExistingAssetPicker({
  open,
  onOpenChange,
  venueImages,
  existingItems,
  onAssign,
}: ExistingAssetPickerProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter out images that are already in the current collection
  const availableImages = useMemo(() => {
    const existingStoragePaths = new Set(existingItems.map((i) => i.storagePath));
    const existingLegacyIds = new Set(existingItems.map((i) => i.legacyVenueImageId).filter(Boolean));
    
    return venueImages.filter((img) => {
      // It's already in the collection if the legacy ID matches OR the storage path matches
      if (existingLegacyIds.has(img.id)) return false;
      if (existingStoragePaths.has(img.storage_path)) return false;
      
      // Filter by search
      if (search) {
        const query = search.toLowerCase();
        return (
          (img.alt_text && img.alt_text.toLowerCase().includes(query)) ||
          img.storage_path.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [venueImages, existingItems, search]);

  const handleToggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleAssign = () => {
    const imagesToAssign = availableImages.filter((img) => selectedIds.has(img.id));
    onAssign(imagesToAssign);
    setSelectedIds(new Set());
    onOpenChange(false);
  };

  const handleClose = () => {
    setSelectedIds(new Set());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-[#f8fbff]">
        <div className="flex items-center justify-between border-b border-[#dbe3ef] bg-white p-4">
          <DialogTitle className="text-lg font-bold text-[#0f172a]">
            Use existing photos
          </DialogTitle>
          <DialogClose className="rounded-md p-1 hover:bg-[#f1f5f9]">
            <X className="h-5 w-5 text-[#64748b]" />
          </DialogClose>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]" />
            <input
              type="text"
              placeholder="Search existing venue photos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[#cbd5e1] py-2 pl-9 pr-4 text-sm outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#dbeafe]"
            />
          </div>

          <div className="h-[500px] overflow-y-auto rounded-xl border border-[#dbe3ef] bg-white p-4">
            {availableImages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-sm font-bold text-[#0f172a]">No available photos found</p>
                <p className="mt-1 max-w-sm text-sm text-[#64748b]">
                  {search ? "Try a different search term." : "You've already added all existing photos to this gallery, or you need to upload new ones first."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                {availableImages.map((img) => {
                  const isSelected = selectedIds.has(img.id);
                  return (
                    <button
                      key={img.id}
                      onClick={() => handleToggle(img.id)}
                      className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                        isSelected ? "border-[#2563eb]" : "border-transparent hover:border-[#cbd5e1]"
                      }`}
                    >
                      <Image
                        src={getVenueMediaUrl(img.storage_path)}
                        alt={img.alt_text || "Venue photo"}
                        fill
                        unoptimized={true}
                        className="object-cover"
                        sizes="200px"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-blue-500/20">
                          <div className="absolute right-2 top-2 rounded-full bg-[#2563eb] p-1 text-white">
                            <Check className="h-3 w-3" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[#dbe3ef] bg-white p-4">
          <p className="text-sm font-medium text-[#64748b]">
            {selectedIds.size} photo{selectedIds.size !== 1 && "s"} selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleAssign}
              disabled={selectedIds.size === 0}
              className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white"
            >
              Add to gallery
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
