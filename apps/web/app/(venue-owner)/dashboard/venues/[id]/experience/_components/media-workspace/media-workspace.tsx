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
  onAddExistingMedia: (event: FormEvent<HTMLFormElement>) => void;
  onArchiveItem: (item: VenueMediaItem) => void;
  onReorderItem: (item: VenueMediaItem, direction: "up" | "down") => void;
};

export function MediaWorkspace({
  profile,
  spaces,
  venueImages,
  onCreateCollection,
  onAddExistingMedia,
  onArchiveItem,
  onReorderItem,
}: Props) {
  return (
    <Panel>
      <SectionTitle
        title="Media Workspace"
        description="Organize existing venue-owned uploads into structured galleries. Upload new files from the base listing page first."
      />
      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-6">
          <form onSubmit={onCreateCollection} className={editorCardClass}>
            <h3 className="text-lg font-bold text-[#0f172a]">Create collection</h3>
            <p className="mt-1 text-sm text-[#64748b]">Group related media together.</p>
            <div className="mt-5 grid gap-4">
              <Field label="Collection type">
                <select name="collectionType" className={inputClass} defaultValue="gallery">
                  {VENUE_MEDIA_COLLECTION_TYPES.filter((type) => type !== "video").map((value) => (
                    <option key={value} value={value}>{getVenueMediaCollectionTypeLabel(value)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Space (optional)">
                <select name="spaceId" className={inputClass}>
                  <option value="">Venue-level collection</option>
                  {spaces.map((space) => (
                    <option key={space.id} value={space.id}>{space.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Title">
                <input name="title" className={inputClass} placeholder="e.g. Main gallery" />
              </Field>
              <Field label="Description">
                <textarea name="description" className={textareaClass} rows={2} />
              </Field>
              <label className="flex items-center gap-3 text-sm font-bold text-[#334155]">
                <input name="isCover" type="checkbox" className="h-4 w-4 rounded border-[#cbd5e1] text-[#1d4ed8] focus:ring-[#93c5fd]" />
                Use as cover collection
              </label>
            </div>
            <SubmitButton label="Create collection" />
          </form>

          <form onSubmit={onAddExistingMedia} className={editorCardClass}>
            <h3 className="text-lg font-bold text-[#0f172a]">Add existing upload</h3>
            {profile.mediaCollections.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-5 text-sm leading-6 text-[#64748b]">
                You need to create a collection first before assigning media to it.
              </div>
            ) : venueImages.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-5 text-sm leading-6 text-[#64748b]">
                No available images to assign. Please upload venue images in your Base Listing first.
              </div>
            ) : (
              <div className="mt-5 grid gap-4">
                <Field label="Collection">
                  <select name="collectionId" className={inputClass}>
                    {profile.mediaCollections.map((collection) => (
                      <option key={collection.id} value={collection.id}>
                        {collection.title || getVenueMediaCollectionTypeLabel(collection.collectionType)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Uploaded media">
                  <select name="imageId" className={inputClass}>
                    {venueImages.map((image) => (
                      <option key={image.id} value={image.id}>
                        {image.media_type} - {image.storage_path.split("/").pop()}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Alt text">
                  <input name="altText" className={inputClass} placeholder="Describe the image for screen readers" />
                </Field>
                <Field label="Caption">
                  <input name="caption" className={inputClass} placeholder="Visible caption" />
                </Field>
                <Field label="Transcript">
                  <textarea name="transcript" rows={2} className={textareaClass} placeholder="For video or complex media" />
                </Field>
                <label className="flex items-center gap-3 text-sm font-bold text-[#334155]">
                  <input name="isFeatured" type="checkbox" className="h-4 w-4 rounded border-[#cbd5e1] text-[#1d4ed8] focus:ring-[#93c5fd]" />
                  Feature inside collection
                </label>
                <SubmitButton label="Add to collection" />
              </div>
            )}
          </form>
        </div>

        <div className="space-y-6">
          {profile.mediaCollections.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-8 text-center">
              <ImageIcon className="mb-4 h-12 w-12 text-[#94a3b8]" />
              <h4 className="text-base font-bold text-[#0f172a]">No collections yet</h4>
              <p className="mt-1 max-w-sm text-sm leading-6 text-[#64748b]">
                Create your first media collection to start organizing photos and videos into structured galleries.
              </p>
            </div>
          ) : (
            profile.mediaCollections.map((collection) => {
              const items = profile.mediaItems.filter(
                (item) =>
                  item.collectionId === collection.id &&
                  item.status !== "archived" &&
                  !item.deletedAt,
              );
              return (
                <div key={collection.id} className={editorCardClass}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-[#0f172a]">
                        {collection.title ||
                          getVenueMediaCollectionTypeLabel(collection.collectionType)}
                      </p>
                      <p className="text-sm text-[#64748b]">
                        {items.length} item{items.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    {collection.isCover ? <StatusBadge status="active" label="Cover Collection" /> : null}
                  </div>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {items.length === 0 ? (
                      <div className="col-span-full rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-6 text-center text-sm text-[#64748b]">
                        No media assigned to this collection yet.
                      </div>
                    ) : (
                      items.map((item) => (
                        <div key={item.id} className="overflow-hidden rounded-xl border border-[#dbe3ef] transition hover:border-[#93c5fd]">
                          <div className="relative aspect-video bg-[#f1f5f9]">
                            {item.mediaType === "image" && item.storagePath ? (
                              <Image
                                src={getVenueMediaUrl(item.storagePath)}
                                alt={item.altText || item.caption || "Venue media"}
                                fill
                                className="object-cover"
                                sizes="320px"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[#64748b]">
                                <ImageIcon className="h-6 w-6" />
                              </div>
                            )}
                          </div>
                          <div className="p-3">
                            <p className="line-clamp-2 text-sm font-bold text-[#0f172a]">
                              {item.caption || item.altText || "Untitled media item"}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => onReorderItem(item, "up")}
                                className="rounded-lg border border-[#dbe3ef] bg-white px-2.5 py-1 text-xs font-bold text-[#475569] transition hover:border-[#93c5fd] hover:text-[#1d4ed8]"
                              >
                                Move up
                              </button>
                              <button
                                type="button"
                                onClick={() => onReorderItem(item, "down")}
                                className="rounded-lg border border-[#dbe3ef] bg-white px-2.5 py-1 text-xs font-bold text-[#475569] transition hover:border-[#93c5fd] hover:text-[#1d4ed8]"
                              >
                                Move down
                              </button>
                              <button
                                type="button"
                                onClick={() => onArchiveItem(item)}
                                className="ml-auto rounded-lg border border-red-200 bg-white px-2.5 py-1 text-xs font-bold text-red-700 transition hover:bg-red-50"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Panel>
  );
}
