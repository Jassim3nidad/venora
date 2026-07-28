"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Check,
  Film,
  Loader2,
  Trash2,
  UploadCloud,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@venora/ui";
import { createClient } from "@/src/lib/supabase/client";
import { getVenueMediaUrl } from "@/features/venues/utils/venue-media";
import { fileHasAllowedSignature } from "@/lib/security/file-signatures";

interface VenueVideo {
  id: string;
  storage_path: string;
  media_type: string;
  display_order: number;
}

interface VenueVideoUploadProps {
  venueId: string;
  organizationId: string;
}

interface UploadState {
  status: "idle" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
  fileName?: string;
}

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime"];

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getVideoExtension(file: File) {
  if (file.type === "video/quicktime") return "mov";
  return "mp4";
}

export default function VenueVideoUpload({
  venueId,
  organizationId,
}: VenueVideoUploadProps) {
  const [video, setVideo] = useState<VenueVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({
    status: "idle",
    progress: 0,
  });

  const supabase = createClient() as any;

  const fetchVideo = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from("venue_images")
        .select("id, storage_path, media_type, display_order")
        .eq("venue_id", venueId)
        .eq("media_type", "video")
        .order("display_order", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setVideo((data as VenueVideo | null) ?? null);
    } catch (err: any) {
      console.error("Error fetching venue video:", err);
      setError("Failed to load promotional video.");
    } finally {
      setLoading(false);
    }
  }, [supabase, venueId]);

  useEffect(() => {
    fetchVideo();
  }, [fetchVideo]);

  const uploadVideo = async (file: File) => {
    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      setUploadState({
        status: "error",
        progress: 0,
        error: "Only MP4 or MOV videos are supported.",
        fileName: file.name,
      });
      return;
    }

    if (file.size > MAX_VIDEO_BYTES) {
      setUploadState({
        status: "error",
        progress: 0,
        error: `Video must be ${formatBytes(MAX_VIDEO_BYTES)} or smaller.`,
        fileName: file.name,
      });
      return;
    }

    if (!(await fileHasAllowedSignature(file))) {
      setUploadState({
        status: "error",
        progress: 0,
        error: "Video content does not match its MP4 or MOV file type.",
        fileName: file.name,
      });
      return;
    }

    setUploadState({
      status: "uploading",
      progress: 10,
      fileName: file.name,
    });

    try {
      if (video) {
        await supabase.storage
          .from("venue-images")
          .remove([video.storage_path]);
        await supabase.from("venue_images").delete().eq("id", video.id);
      }

      const extension = getVideoExtension(file);
      const uniqueFileName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${extension}`;
      const storagePath = `${organizationId}/${venueId}/${uniqueFileName}`;

      setUploadState((prev) => ({ ...prev, progress: 35 }));

      const { error: uploadError } = await supabase.storage
        .from("venue-images")
        .upload(storagePath, file, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploadState((prev) => ({ ...prev, progress: 75 }));

      const { data: dbData, error: dbError } = await supabase
        .from("venue_images")
        .insert({
          venue_id: venueId,
          storage_path: storagePath,
          media_type: "video",
          display_order: 0,
          is_featured: false,
        })
        .select("id, storage_path, media_type, display_order")
        .single();

      if (dbError) throw dbError;

      setVideo(dbData as VenueVideo);
      setUploadState({
        status: "success",
        progress: 100,
        fileName: file.name,
      });
    } catch (err: any) {
      console.error("Error uploading venue video:", err);
      setUploadState({
        status: "error",
        progress: 0,
        error: err.message || "Failed to upload video.",
        fileName: file.name,
      });
    }
  };

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    void uploadVideo(file);
  };

  const handleDrag = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === "dragenter" || event.type === "dragover") {
      setDragActive(true);
    } else if (event.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    handleFiles(event.dataTransfer.files);
  };

  const handleDelete = async () => {
    if (!video) return;
    if (!confirm("Remove this promotional video?")) return;

    try {
      await supabase.storage.from("venue-images").remove([video.storage_path]);
      const { error: dbError } = await supabase
        .from("venue_images")
        .delete()
        .eq("id", video.id);

      if (dbError) throw dbError;

      setVideo(null);
      setUploadState({ status: "idle", progress: 0 });
    } catch (err: any) {
      console.error("Error deleting venue video:", err);
      alert("Failed to delete promotional video.");
    }
  };

  return (
    <Card className="w-full overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--bg-base)] shadow-md">
      <CardHeader className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]/50 pb-4">
        <CardTitle className="flex items-center gap-2 font-display text-xl font-bold text-[var(--text-primary)]">
          <Film className="h-5 w-5 text-[var(--color-brand-600)]" />
          Promotional Video
        </CardTitle>
        <CardDescription className="text-sm text-[var(--text-secondary)]">
          Upload one short video to showcase your venue on the public profile
          page. MP4 or MOV up to 50MB.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        {error ? (
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-danger)]/10 bg-[var(--color-danger-bg)] p-4 text-sm text-[var(--color-danger)]">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-[var(--text-secondary)]">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-brand-600)]" />
            <span className="text-xs">Loading promotional video...</span>
          </div>
        ) : video ? (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-black">
              <video
                src={getVenueMediaUrl(video.storage_path)}
                controls
                playsInline
                className="aspect-video w-full bg-black"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge className="rounded-full bg-[var(--color-brand-50)] px-3 py-1 text-[10px] font-bold text-[var(--color-brand-700)]">
                Live on venue profile
              </Badge>
              <div className="flex gap-2">
                <label
                  htmlFor="venue-video-replace-input"
                  className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl border border-[var(--border-default)] bg-white px-4 text-xs font-semibold text-[var(--text-primary)] transition hover:bg-[var(--bg-subtle)]"
                >
                  Replace Video
                </label>
                <input
                  id="venue-video-replace-input"
                  type="file"
                  accept="video/mp4,video/quicktime,.mp4,.mov"
                  className="hidden"
                  onChange={(event) => handleFiles(event.target.files)}
                />
                <Button
                  type="button"
                  onClick={handleDelete}
                  className="h-9 rounded-xl border-none bg-red-600 px-4 text-xs font-semibold text-white hover:bg-red-700"
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Remove
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
              dragActive
                ? "scale-[1.01] border-[var(--color-brand-500)] bg-[var(--color-brand-50)]/30"
                : "border-[var(--border-strong)] hover:border-[var(--color-brand-400)] hover:bg-[var(--bg-subtle)]/30"
            }`}
          >
            <input
              id="venue-video-input"
              type="file"
              accept="video/mp4,video/quicktime,.mp4,.mov"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(event) => handleFiles(event.target.files)}
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-600)] shadow-sm transition-transform duration-300 group-hover:scale-110">
              <UploadCloud className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-[var(--text-primary)]">
              Drag & drop a promotional video here
            </h3>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              MP4 or MOV, up to 50MB
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 h-9 rounded-xl border-[var(--border-default)] px-4 text-xs font-medium hover:bg-[var(--bg-subtle)]"
            >
              Select Video
            </Button>
          </div>
        )}

        {uploadState.status === "uploading" ? (
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4 text-sm">
            <div className="flex items-center gap-2 font-medium text-[var(--color-brand-600)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading {uploadState.fileName}...
            </div>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {uploadState.progress}% complete
            </p>
          </div>
        ) : null}

        {uploadState.status === "success" ? (
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
            <Check className="h-4 w-4" />
            Promotional video uploaded successfully.
          </div>
        ) : null}

        {uploadState.status === "error" && uploadState.error ? (
          <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            <AlertCircle className="h-4 w-4" />
            {uploadState.error}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
