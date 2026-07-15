"use client";

import { useRef, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ImageCropperModal } from "./ImageCropperModal";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

type SupplierImageUploadProps = {
  onUploadSuccess: (url: string) => void;
  label?: string;
  className?: string;
  aspectRatio?: number;
};

export function SupplierImageUpload({
  onUploadSuccess,
  label = "Upload Image",
  className = "",
  aspectRatio = 1,
}: SupplierImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string>("");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // reset

    if (!file) return;
    setError(null);

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError("Please choose a JPEG, PNG, or WEBP image.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("Image must be 5 MB or smaller.");
      return;
    }

    setOriginalFileName(file.name);
    setCropImageUrl(URL.createObjectURL(file));
  };

  const handleCropSubmit = async (croppedBlob: Blob) => {
    setCropImageUrl(null); // Close modal
    setIsUploading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in to upload images.");
      }

      const safeName =
        originalFileName.replace(/[^a-zA-Z0-9.-]/g, "") || "image.jpg";
      const storagePath = `${user.id}/supplier-${Date.now()}-${safeName}`;

      // Create a new File from the blob
      const fileToUpload = new File([croppedBlob], safeName, {
        type: "image/jpeg",
      });

      // We use the avatars bucket because it's public and allows authenticated self-upload
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(storagePath, fileToUpload, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(storagePath);
      onUploadSuccess(data.publicUrl);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not upload image.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleCloseCrop = () => {
    setCropImageUrl(null);
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UploadCloud className="h-4 w-4" />
        )}
        {isUploading ? "Uploading..." : label}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_MIME_TYPES.join(",")}
        className="hidden"
        onChange={handleFileChange}
      />

      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

      {cropImageUrl && (
        <ImageCropperModal
          isOpen={!!cropImageUrl}
          onClose={handleCloseCrop}
          imageUrl={cropImageUrl}
          aspectRatio={aspectRatio}
          onCropSubmit={handleCropSubmit}
        />
      )}
    </div>
  );
}
