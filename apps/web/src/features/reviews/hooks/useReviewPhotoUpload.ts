"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fileHasAllowedSignature } from "@/lib/security/file-signatures";

const MAX_PHOTOS = 5;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export type UploadedPhoto = { storagePath: string; url: string };

export function useReviewPhotoUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * `folderId` is just the storage path's second segment — it can be a real
   * review id (post-hoc upload) or a client-generated temp id used before
   * the review row exists yet (upload-during-submission flow). RLS only
   * enforces the first segment (`{customer_id}/...`) matches auth.uid().
   */
  async function uploadPhotos(
    files: File[],
    folderId: string,
    userId: string,
  ): Promise<UploadedPhoto[]> {
    setError(null);

    if (files.length === 0) return [];

    if (files.length > MAX_PHOTOS) {
      setError(`You can attach up to ${MAX_PHOTOS} photos per review.`);
      return [];
    }

    const invalidFile = files.find(
      (file) =>
        !ALLOWED_MIME_TYPES.includes(file.type) ||
        file.size > MAX_FILE_SIZE_BYTES,
    );
    if (invalidFile) {
      setError(
        `"${invalidFile.name}" must be a JPEG, PNG, or WEBP image under 10 MB.`,
      );
      return [];
    }

    for (const file of files) {
      if (!(await fileHasAllowedSignature(file))) {
        setError(`"${file.name}" content does not match its image file type.`);
        return [];
      }
    }

    setIsUploading(true);
    const supabase = createClient();
    const uploaded: UploadedPhoto[] = [];

    try {
      for (const file of files) {
        const path = `${userId}/${folderId}/${crypto.randomUUID()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("review-photos")
          .upload(path, file);
        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from("review-photos")
          .getPublicUrl(path);
        uploaded.push({ storagePath: path, url: data.publicUrl });
      }
      return uploaded;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Photo upload failed. Please try again.",
      );
      return uploaded;
    } finally {
      setIsUploading(false);
    }
  }

  return { uploadPhotos, isUploading, error, setError };
}
