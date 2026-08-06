import React, { useState, useEffect } from "react";
import Image from "next/image";
import { X, Save, AlertCircle } from "lucide-react";
import type { VenueMediaItem } from "@/src/features/venues/domain/structured-venue.types";
import { getVenueMediaUrl } from "@/src/features/venues/utils/venue-media";

interface MediaDetailsPanelProps {
  item: VenueMediaItem | null;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<VenueMediaItem>) => Promise<void> | void;
  onArchive: (item: VenueMediaItem) => void;
}

export function MediaDetailsPanel({
  item,
  onClose,
  onUpdate,
  onArchive,
}: MediaDetailsPanelProps) {
  const [altText, setAltText] = useState("");
  const [caption, setCaption] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (item) {
      setAltText(item.altText || "");
      setCaption(item.caption || "");
      setIsFeatured(item.isFeatured || false);
      setHasChanges(false);
    }
  }, [item]);

  if (!item) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(item.id, {
        altText,
        caption,
        isFeatured,
      });
      setHasChanges(false);
    } catch (err) {
      console.error("Failed to update media item", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAltTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAltText(e.target.value);
    setHasChanges(true);
  };

  const handleCaptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCaption(e.target.value);
    setHasChanges(true);
  };

  const handleFeaturedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsFeatured(e.target.checked);
    setHasChanges(true);
  };

  const inputClass =
    "w-full rounded-lg border border-[#dbe3ef] bg-[#f8fbff] px-3 py-2 text-sm text-[#0f172a] shadow-sm outline-none transition focus:border-[#93c5fd] focus:bg-white focus:ring-4 focus:ring-blue-50";

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-[#dbe3ef] bg-white shadow-xl sm:w-96">
      <div className="flex items-center justify-between border-b border-[#dbe3ef] p-4">
        <h3 className="text-lg font-bold text-[#0f172a]">Media Details</h3>
        <button
          onClick={onClose}
          className="rounded-md p-2 text-[#64748b] transition-colors hover:bg-[#f1f5f9] hover:text-[#0f172a]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="relative mb-6 aspect-video overflow-hidden rounded-lg border border-[#dbe3ef] bg-[#f1f5f9]">
          {item.mediaType === "image" && item.storagePath && (
            <Image
              src={getVenueMediaUrl(item.storagePath)}
              alt={item.altText || "Venue media"}
              fill
              unoptimized={true}
              className="object-contain"
              sizes="384px"
            />
          )}
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-1.5 flex items-center justify-between text-sm font-bold text-[#334155]">
              Alt Text
              {!altText && <div title="Missing alt text"><AlertCircle className="h-4 w-4 text-amber-500" /></div>}
            </label>
            <input
              type="text"
              value={altText}
              onChange={handleAltTextChange}
              placeholder="Describe the image for screen readers"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-[#64748b]">
              Crucial for accessibility and SEO. Describe what is happening in the image.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-[#334155]">
              Caption (Optional)
            </label>
            <input
              type="text"
              value={caption}
              onChange={handleCaptionChange}
              placeholder="Visible text below the image"
              className={inputClass}
            />
          </div>

          <div>
            <label className="flex items-center gap-3 text-sm font-bold text-[#334155]">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={handleFeaturedChange}
                className="h-4 w-4 rounded border-[#cbd5e1] text-[#1d4ed8] focus:ring-[#93c5fd]"
              />
              Use as gallery cover
            </label>
            <p className="mt-1 text-xs text-[#64748b] ml-7">
              This image will represent the gallery on the public venue page.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-[#dbe3ef] p-4 flex flex-col gap-3 bg-[#f8fbff]">
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1d4ed8] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#1e40af] disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save changes"}
        </button>
        <button
          onClick={() => {
            onClose();
            onArchive(item);
          }}
          className="w-full rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-50"
        >
          Remove from gallery
        </button>
      </div>
    </div>
  );
}
