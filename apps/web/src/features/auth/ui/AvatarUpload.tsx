"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  removeAvatarAction,
  updateAvatarAction,
} from "@/features/auth/actions/auth.actions";
import { compressImageForAvatar } from "@/lib/image-compress";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

type AvatarUploadProps = {
  userId: string;
  initialAvatarUrl: string | null;
  displayName: string;
};

function getInitials(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
}

export function AvatarUpload({
  userId,
  initialAvatarUrl,
  displayName,
}: AvatarUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isBusy = isUploading || isPending;
  const initials = getInitials(displayName);

  useEffect(() => {
    setAvatarUrl(initialAvatarUrl);
  }, [initialAvatarUrl]);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setError(null);
    setSuccessMessage(null);

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError("Please choose a JPEG, PNG, or WEBP image.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("Image must be 5 MB or smaller.");
      return;
    }

    setIsUploading(true);

    try {
      const { file: compressedFile } = await compressImageForAvatar(file);
      const storagePath = `${userId}/avatar-${crypto.randomUUID()}.jpg`;
      const supabase = createClient();

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(storagePath, compressedFile, {
          contentType: "image/jpeg",
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(storagePath);
      const response = await updateAvatarAction({
        avatarUrl: data.publicUrl,
        storagePath,
      });

      if (!response.success) {
        await supabase.storage.from("avatars").remove([storagePath]);
        throw new Error(response.error);
      }

      setAvatarUrl(data.publicUrl);
      setSuccessMessage("Profile picture updated.");
      router.refresh();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not upload profile picture.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const response = await removeAvatarAction();

      if (!response.success) {
        setError(response.error);
        return;
      }

      setAvatarUrl(null);
      setSuccessMessage("Profile picture removed.");
      router.refresh();
    });
  };

  return (
    <div className="rounded-2xl border border-[#E5E7EB]/80 bg-[#F9FAFB] p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative mx-auto h-24 w-24 shrink-0 sm:mx-0">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border border-[#DBEAFE] bg-[#EFF6FF] text-2xl font-black text-[#2563EB] shadow-sm">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              initials || <UserRound className="h-8 w-8" />
            )}
          </div>

          {isBusy ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-white/80">
              <Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" />
            </div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-sm font-extrabold text-slate-900">
            Profile picture
          </p>
          <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
            Upload a photo so your account feels more personal across Venora.
            Square images work best.
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isBusy}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#2563EB] px-4 text-sm font-extrabold text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Camera className="h-4 w-4" />
              {avatarUrl ? "Change photo" : "Upload photo"}
            </button>

            {avatarUrl ? (
              <button
                type="button"
                onClick={handleRemove}
                disabled={isBusy}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white px-4 text-sm font-extrabold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Trash2 className="h-4 w-4" />
                Remove
              </button>
            ) : null}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_MIME_TYPES.join(",")}
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {successMessage ? (
        <p className="mt-4 text-sm font-semibold text-emerald-700">
          {successMessage}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm font-semibold text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
