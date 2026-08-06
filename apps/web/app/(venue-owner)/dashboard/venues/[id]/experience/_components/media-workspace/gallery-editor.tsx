import React, { useState } from "react";
import Image from "next/image";
import { Image as ImageIcon, CheckCircle2, AlertCircle } from "lucide-react";
import { type VenueMediaCollection, type VenueMediaItem, getVenueMediaCollectionTypeLabel } from "@/src/features/venues/domain/structured-venue.types";
import { getVenueMediaUrl } from "@/src/features/venues/utils/venue-media";
import { MediaUploader } from "./media-uploader";
import { StatusBadge } from "@/components/dashboard/enterprise";

interface GalleryEditorProps {
  collection: VenueMediaCollection;
  items: VenueMediaItem[];
  venueId: string;
  organizationId: string;
  onAssetSelected: (item: VenueMediaItem) => void;
  onOpenExistingPicker: () => void;
  onUploadSuccess: (asset: any) => void;
}

export function GalleryEditor({
  collection,
  items,
  venueId,
  organizationId,
  onAssetSelected,
  onOpenExistingPicker,
  onUploadSuccess,
}: GalleryEditorProps) {
  const [showUploader, setShowUploader] = useState(false);

  return (
    <div className="flex flex-col rounded-xl border border-[#dbe3ef] bg-white shadow-sm overflow-hidden">
      <div className="border-b border-[#dbe3ef] bg-[#f8fbff] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#0f172a]">
              {collection.title || getVenueMediaCollectionTypeLabel(collection.collectionType)}
            </h2>
            {collection.description && (
              <p className="mt-1 text-sm text-[#64748b]">{collection.description}</p>
            )}
          </div>
          <div className="flex gap-2">
            {collection.isCover && <StatusBadge status="active" label="Cover Collection" />}
            <button className="rounded-lg border border-[#dbe3ef] bg-white px-3 py-1.5 text-sm font-bold text-[#475569] hover:bg-[#f8fafc]">
              Edit gallery
            </button>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setShowUploader(!showUploader)}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
              showUploader 
                ? "bg-[#1d4ed8] text-white hover:bg-[#1e40af]" 
                : "bg-white border border-[#cbd5e1] text-[#0f172a] hover:bg-[#f8fafc]"
            }`}
          >
            Upload photos
          </button>
          <button
            onClick={onOpenExistingPicker}
            className="rounded-lg border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-bold text-[#0f172a] hover:bg-[#f8fafc] transition-colors"
          >
            Use existing photos
          </button>
        </div>
      </div>

      <div className="p-6">
        {showUploader && (
          <div className="mb-8">
            <MediaUploader 
              venueId={venueId} 
              organizationId={organizationId} 
              onUploadSuccess={(asset) => {
                onUploadSuccess(asset);
                // We don't hide the uploader automatically so they can keep uploading
              }} 
            />
          </div>
        )}

        {items.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-8 text-center">
            <h4 className="text-base font-bold text-[#0f172a]">This gallery is empty</h4>
            <p className="mt-1 max-w-sm text-sm leading-6 text-[#64748b]">
              Add uploaded venue photos to start building this gallery.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => {
              const hasAltText = !!item.altText;
              return (
                <div 
                  key={item.id} 
                  onClick={() => onAssetSelected(item)}
                  className="group relative cursor-pointer overflow-hidden rounded-xl border border-[#dbe3ef] transition-all hover:border-[#93c5fd] hover:shadow-md"
                >
                  <div className="relative aspect-square bg-[#f1f5f9]">
                    {item.mediaType === "image" && item.storagePath ? (
                      <Image
                        src={getVenueMediaUrl(item.storagePath)}
                        alt={item.altText || item.caption || "Venue media"}
                        fill
                        unoptimized={true}
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[#64748b]">
                        <ImageIcon className="h-8 w-8 opacity-50" />
                      </div>
                    )}
                    
                    {/* Status Icons Overlay */}
                    <div className="absolute top-2 right-2 flex gap-1">
                      {item.isFeatured && (
                        <div className="rounded-full bg-blue-500 p-1 text-white shadow-sm" title="Gallery Cover">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                      )}
                      {!hasAltText && (
                        <div className="rounded-full bg-amber-100 p-1 text-amber-700 shadow-sm" title="Missing alt text">
                          <AlertCircle className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
