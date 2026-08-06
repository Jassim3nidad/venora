"use client";

import { type FormEvent } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { Panel, StatusBadge } from "@/components/dashboard/enterprise";
import { SectionTitle } from "../section-title";
import { SubmitButton } from "../submit-button";
import { 
  VENUE_MEDIA_COLLECTION_TYPES,
  getVenueMediaCollectionTypeLabel,
  type DraftStructuredVenueProfile,
  type VenueSpace,
  type VenueMediaItem
} from "@/src/features/venues/domain/structured-venue.types";
import { getVenueMediaUrl } from "@/src/features/venues/utils/venue-media";
import type { VenueImage } from "../../structured-venue-editor-client";
import { GalleryNavigation } from "./gallery-navigation";
import { GalleryEditor } from "./gallery-editor";
import { ExistingAssetPicker } from "./existing-asset-picker";
import { MediaDetailsPanel } from "./media-details-panel";
import { useState } from "react";

const inputClass = "w-full rounded-lg border border-[#dbe3ef] bg-[#f8fbff] px-3 py-2 text-sm text-[#0f172a] shadow-sm outline-none transition focus:border-[#93c5fd] focus:bg-white focus:ring-4 focus:ring-blue-50";
const textareaClass = "w-full rounded-lg border border-[#dbe3ef] bg-[#f8fbff] px-3 py-2 text-sm text-[#0f172a] shadow-sm outline-none transition focus:border-[#93c5fd] focus:bg-white focus:ring-4 focus:ring-blue-50";
const editorCardClass = "rounded-xl border border-[#dbe3ef] bg-white p-6 shadow-sm";

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="mb-1.5 text-sm font-bold text-[#334155]">{label}</p>
      {children}
    </div>
  );
}

type Props = {
  profile: DraftStructuredVenueProfile;
  spaces: VenueSpace[];
  venueImages: VenueImage[];
  onCreateCollection: (event: FormEvent<HTMLFormElement>) => void;
  onAddExistingMedia: (collectionId: string, images: VenueImage[]) => void;
  onArchiveItem: (item: VenueMediaItem) => void;
  onUpdateItem: (item: VenueMediaItem, updates: Partial<VenueMediaItem>) => void;
  onReorderItem: (item: VenueMediaItem, direction: "up" | "down") => void;
  organizationId: string;
};

export function MediaWorkspace({
  profile,
  spaces,
  venueImages,
  onCreateCollection,
  onAddExistingMedia,
  onArchiveItem,
  onUpdateItem,
  onReorderItem,
  organizationId,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    profile.mediaCollections[0]?.id ?? null
  );
  const [isCreatingNew, setIsCreatingNew] = useState(profile.mediaCollections.length === 0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<VenueMediaItem | null>(null);

  // Compute items count map
  const itemsCountMap = profile.mediaCollections.reduce((acc, col) => {
    acc[col.id] = profile.mediaItems.filter(
      (item) => item.collectionId === col.id && item.status !== "archived" && !item.deletedAt
    ).length;
    return acc;
  }, {} as Record<string, number>);

  const activeCollection = profile.mediaCollections.find((c) => c.id === selectedId);
  const activeItems = activeCollection
    ? profile.mediaItems.filter(
        (item) => item.collectionId === activeCollection.id && item.status !== "archived" && !item.deletedAt
      ).sort((a, b) => a.displayOrder - b.displayOrder)
    : [];

  const handleCreateSuccess = (e: React.FormEvent<HTMLFormElement>) => {
    // Note: The parent handles the actual creation. We just reset the view.
    // In a real app, we might wait for the callback to finish and select the new collection.
    setIsCreatingNew(false);
    onCreateCollection(e);
  };

  return (
    <Panel>
      <SectionTitle
        title="Media Workspace"
        description="Upload photos once, organize them into galleries and connect them to the spaces customers will explore."
      />
      
      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)] items-start">
        <div className="sticky top-6 space-y-6">
          <GalleryNavigation
            collections={profile.mediaCollections}
            selectedId={isCreatingNew ? null : selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setIsCreatingNew(false);
            }}
            onCreateNew={() => {
              setIsCreatingNew(true);
              setSelectedId(null);
            }}
            itemsCountMap={itemsCountMap}
          />
        </div>

        <div className="space-y-6">
          {isCreatingNew || profile.mediaCollections.length === 0 ? (
            <form onSubmit={handleCreateSuccess} className={editorCardClass}>
              <h3 className="text-lg font-bold text-[#0f172a]">Create gallery</h3>
              <p className="mt-1 text-sm text-[#64748b]">Group related media together.</p>
              <div className="mt-5 grid gap-4">
                <Field label="Gallery type">
                  <select name="collectionType" className={inputClass} defaultValue="gallery">
                    {VENUE_MEDIA_COLLECTION_TYPES.filter((type) => type !== "video").map((value) => (
                      <option key={value} value={value}>{getVenueMediaCollectionTypeLabel(value)}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Related space (optional)">
                  <select name="spaceId" className={inputClass}>
                    <option value="">General venue gallery</option>
                    {spaces.map((space) => (
                      <option key={space.id} value={space.id}>{space.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Title">
                  <input name="title" className={inputClass} placeholder="e.g. Resort Highlights" />
                </Field>
                <Field label="Description">
                  <textarea name="description" className={textareaClass} rows={2} />
                </Field>
                <label className="flex items-center gap-3 text-sm font-bold text-[#334155]">
                  <input name="isCover" type="checkbox" className="h-4 w-4 rounded border-[#cbd5e1] text-[#1d4ed8] focus:ring-[#93c5fd]" />
                  Use as cover gallery
                </label>
              </div>
              <div className="mt-4 flex gap-3">
                <SubmitButton label="Create gallery" />
                {profile.mediaCollections.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingNew(false);
                      setSelectedId(profile.mediaCollections[0]?.id || null);
                    }}
                    className="rounded-lg border border-[#cbd5e1] bg-white px-4 py-2 text-sm font-bold text-[#0f172a] hover:bg-[#f8fafc]"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          ) : activeCollection ? (
            <GalleryEditor
              collection={activeCollection}
              items={activeItems}
              venueId={profile.revision.venueId}
              organizationId={organizationId}
              onAssetSelected={setSelectedItem}
              onOpenExistingPicker={() => setPickerOpen(true)}
              onUploadSuccess={(asset) => {
                // Instantly assign the newly uploaded asset
                onAddExistingMedia(activeCollection.id, [asset]);
              }}
            />
          ) : null}
        </div>
      </div>
      
      {activeCollection && (
        <ExistingAssetPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          venueImages={venueImages}
          existingItems={activeItems}
          onAssign={(imagesToAssign) => {
            onAddExistingMedia(activeCollection.id, imagesToAssign);
          }}
        />
      )}

      {selectedItem && (
        <MediaDetailsPanel
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={(id, updates) => onUpdateItem(selectedItem, updates)}
          onArchive={(item) => {
            setSelectedItem(null);
            onArchiveItem(item);
          }}
        />
      )}
    </Panel>
  );
}
