"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import {
  useReviewPhotoUpload,
  type UploadedPhoto,
} from "../hooks/useReviewPhotoUpload";

type ReviewPhotoUploaderProps = {
  /** A real review id (post-hoc upload) or a temp id if the review doesn't exist yet. */
  folderId: string;
  userId: string;
  maxPhotos?: number;
  onChange?: (photos: UploadedPhoto[]) => void;
};

export function ReviewPhotoUploader({
  folderId,
  userId,
  maxPhotos = 5,
  onChange,
}: ReviewPhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadPhotos, isUploading, error } = useReviewPhotoUpload();
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const remainingSlots = maxPhotos - photos.length;
    const files = Array.from(fileList).slice(0, remainingSlots);
    const uploaded = await uploadPhotos(files, folderId, userId);

    if (uploaded.length > 0) {
      const next = [...photos, ...uploaded];
      setPhotos(next);
      onChange?.(next);
    }
    if (inputRef.current) inputRef.current.value = "";
  }

  function removePhoto(storagePath: string) {
    const next = photos.filter((photo) => photo.storagePath !== storagePath);
    setPhotos(next);
    onChange?.(next);
  }

  return (
    <div className="grid gap-3">
      <span className="text-sm font-bold text-[var(--text-primary)]">
        Photos (optional)
      </span>

      {photos.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {photos.map((photo) => (
            <div
              key={photo.storagePath}
              className="relative aspect-square overflow-hidden rounded-xl border border-[var(--border-default)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt="Review photo"
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(photo.storagePath)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white transition hover:bg-black/80"
                aria-label="Remove photo"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs font-semibold text-[var(--text-muted)]">
          No photos added yet.
        </p>
      )}

      {photos.length < maxPhotos ? (
        <button
          type="button"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-11 w-fit items-center gap-2 rounded-xl border border-dashed border-[var(--border-default)] px-4 text-sm font-bold text-[var(--text-secondary)] transition hover:border-[var(--color-brand-500)] hover:text-[var(--color-brand-500)] disabled:opacity-60"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          {isUploading ? "Uploading..." : "Add photos"}
        </button>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />

      {error ? (
        <p className="text-xs font-semibold text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
