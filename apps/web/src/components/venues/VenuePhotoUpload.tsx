"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  UploadCloud, 
  X, 
  Check, 
  Trash2, 
  Star, 
  Loader2, 
  AlertCircle, 
  Image as ImageIcon 
} from "lucide-react";
import { createClient } from "@/src/lib/supabase/client";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Badge } from "@venora/ui";

interface VenueMedia {
  id: string;
  storage_path: string;
  media_type: string;
  alt_text: string | null;
  display_order: number;
  is_featured: boolean;
}

interface VenuePhotoUploadProps {
  venueId: string;
  organizationId: string;
}

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
  status: "compressing" | "uploading" | "success" | "error";
  originalSize?: number;
  compressedSize?: number;
  savings?: number;
  error?: string;
}

interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  savings: number;
}

// Utility function for client-side Canvas compression
const compressImage = (
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.82
): Promise<CompressionResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Image compression failed"));
              return;
            }
            // Generate clean filename with .jpg extension
            const cleanName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
            const compressedFile = new File([blob], cleanName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            const originalSize = file.size;
            const compressedSize = compressedFile.size;
            const savings = Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100));

            resolve({
              file: compressedFile,
              originalSize,
              compressedSize,
              savings,
            });
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export default function VenuePhotoUpload({ venueId, organizationId }: VenuePhotoUploadProps) {
  const [images, setImages] = useState<VenueMedia[]>([]);
  const [uploadQueue, setUploadQueue] = useState<UploadingFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Cast client as any to prevent strict type check mismatches with Supabase generated Database types
  const supabase = createClient() as any;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://szmjjkywcsnzkgqevinz.supabase.co";

  const getMediaUrl = (path: string) => {
    if (path.startsWith("http") || path.startsWith("/")) return path;
    return `${supabaseUrl}/storage/v1/object/public/venue-images/${path}`;
  };

  // Format bytes helper
  const formatBytes = (bytes: number, decimals = 1) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  // Fetch current images for this venue
  const fetchImages = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("venue_images")
        .select("*")
        .eq("venue_id", venueId)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setImages((data as VenueMedia[]) || []);
    } catch (err: any) {
      console.error("Error fetching images:", err);
      setError("Failed to load existing venue images.");
    } finally {
      setLoading(false);
    }
  }, [venueId, supabase]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Handle Drag Events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  // Upload processed files queue
  const processAndUploadFiles = async (files: FileList) => {
    const fileList = Array.from(files);
    const newQueueItems: UploadingFile[] = fileList.map((file, idx) => ({
      id: `${file.name}-${Date.now()}-${idx}`,
      name: file.name,
      progress: 0,
      status: "compressing",
    }));

    setUploadQueue((prev) => [...prev, ...newQueueItems]);

    // Process each file
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const queueItem = newQueueItems[i];
      if (!file || !queueItem) continue;

      try {
        // Step 1: Compress the Image client-side
        const compressionResult = await compressImage(file);
        
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === queueItem.id
              ? {
                  ...item,
                  status: "uploading",
                  progress: 20,
                  originalSize: compressionResult.originalSize,
                  compressedSize: compressionResult.compressedSize,
                  savings: compressionResult.savings,
                }
              : item
          )
        );

        // Step 2: Upload to Supabase Storage
        const fileExt = "jpg";
        const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        // Path convention: {organization_id}/{venue_id}/{filename}
        const storagePath = `${organizationId}/${venueId}/${uniqueFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("venue-images")
          .upload(storagePath, compressionResult.file, {
            contentType: "image/jpeg",
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === queueItem.id ? { ...item, progress: 70 } : item
          )
        );

        // Step 3: Insert Row into database
        // Determine display order (max display_order + 1)
        const nextOrder = images.length > 0 
          ? Math.max(...images.map((img) => img.display_order)) + 1 
          : 0;
        
        // If there are no images yet, make this the featured image
        const isFeatured = images.length === 0;

        const { data: dbData, error: dbError } = await supabase
          .from("venue_images")
          .insert({
            venue_id: venueId,
            storage_path: storagePath,
            media_type: "image",
            display_order: nextOrder,
            is_featured: isFeatured,
          })
          .select()
          .single();

        if (dbError) throw dbError;

        // Success! Update local images state and queue item
        setImages((prev) => [...prev, dbData as VenueMedia]);
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === queueItem.id ? { ...item, status: "success", progress: 100 } : item
          )
        );
      } catch (err: any) {
        console.error("Error uploading file:", file.name, err);
        setUploadQueue((prev) =>
          prev.map((item) =>
            item.id === queueItem.id
              ? { ...item, status: "error", error: err.message || "Failed to upload" }
              : item
          )
        );
      }
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processAndUploadFiles(e.dataTransfer.files);
    }
  }, [images, venueId, organizationId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processAndUploadFiles(e.target.files);
    }
  };

  // Set image as Featured
  const handleSetFeatured = async (imageId: string) => {
    try {
      // Set all other images to false, and the chosen one to true
      const { error: resetError } = await supabase
        .from("venue_images")
        .update({ is_featured: false })
        .eq("venue_id", venueId);

      if (resetError) throw resetError;

      const { error: setError } = await supabase
        .from("venue_images")
        .update({ is_featured: true })
        .eq("id", imageId);

      if (setError) throw setError;

      // Update local state
      setImages((prev) =>
        prev.map((img) => ({
          ...img,
          is_featured: img.id === imageId,
        }))
      );
    } catch (err: any) {
      console.error("Error setting featured image:", err);
      alert("Failed to update featured photo.");
    }
  };

  // Delete Image
  const handleDeleteImage = async (image: VenueMedia) => {
    if (!confirm("Are you sure you want to delete this image?")) return;

    try {
      // 1. Delete from Supabase Storage
      const { error: storageError } = await supabase.storage
        .from("venue-images")
        .remove([image.storage_path]);

      if (storageError) {
        // Log storage error, but proceed to check if database record exists or can be removed
        console.warn("Storage removal warning (might have been missing):", storageError);
      }

      // 2. Delete from Database
      const { error: dbError } = await supabase
        .from("venue_images")
        .delete()
        .eq("id", image.id);

      if (dbError) throw dbError;

      // 3. Update local state
      setImages((prev) => prev.filter((img) => img.id !== image.id));
      
      // If we deleted the featured image, make the first remaining image featured (if any exist)
      if (image.is_featured && images.length > 1) {
        const remaining = images.filter((img) => img.id !== image.id);
        const newFeatured = remaining[0];
        if (newFeatured) {
          await handleSetFeatured(newFeatured.id);
        }
      }
    } catch (err: any) {
      console.error("Error deleting image:", err);
      alert("Failed to delete photo.");
    }
  };

  // Clear completed/errored items from queue
  const clearQueue = () => {
    setUploadQueue([]);
  };

  return (
    <Card className="w-full border border-[var(--border-default)] shadow-md overflow-hidden bg-[var(--bg-base)] rounded-3xl">
      <CardHeader className="border-b border-[var(--border-default)] bg-[var(--bg-subtle)]/50 pb-4">
        <CardTitle className="text-xl font-bold font-display text-[var(--text-primary)] flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-[var(--color-brand-600)]" />
          Venue Photos
        </CardTitle>
        <CardDescription className="text-sm text-[var(--text-secondary)]">
          Upload crisp images for your venue. Photos are compressed on the fly to save bandwidth and load faster.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--color-danger-bg)] text-[var(--color-danger)] text-sm border border-[var(--color-danger)]/10">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Drag and Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`relative group flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer ${
            dragActive
              ? "border-[var(--color-brand-500)] bg-[var(--color-brand-50)]/30 scale-[1.01]"
              : "border-[var(--border-strong)] hover:border-[var(--color-brand-400)] hover:bg-[var(--bg-subtle)]/30"
          }`}
        >
          <input
            id="venue-photo-input"
            type="file"
            multiple
            accept="image/*"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={handleFileChange}
          />
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand-50)] text-[var(--color-brand-600)] group-hover:scale-110 transition-transform duration-300 shadow-sm">
            <UploadCloud className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-[var(--text-primary)]">
            Drag & drop venue photos here
          </h3>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            PNG, JPG, or WEBP up to 50MB (will be compressed to Web-friendly JPEG)
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 rounded-xl border-[var(--border-default)] hover:bg-[var(--bg-subtle)] font-medium h-9 text-xs px-4"
          >
            Select Files
          </Button>
        </div>

        {/* Uploading Queue */}
        {uploadQueue.length > 0 && (
          <div className="p-4 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-default)] space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                Upload Queue ({uploadQueue.filter(q => q.status === "success").length}/{uploadQueue.length})
              </h4>
              {uploadQueue.every((q) => q.status === "success" || q.status === "error") && (
                <button
                  onClick={clearQueue}
                  className="text-xs font-semibold text-[var(--color-brand-600)] hover:underline"
                >
                  Clear Queue
                </button>
              )}
            </div>
            <div className="divide-y divide-[var(--border-default)] max-h-48 overflow-y-auto">
              {uploadQueue.map((item) => (
                <div key={item.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-[var(--text-primary)]">{item.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[var(--text-secondary)] text-[10px]">
                      {item.status === "compressing" && (
                        <span className="flex items-center gap-1 text-[var(--color-warning)] font-medium">
                          <Loader2 className="h-3 w-3 animate-spin" /> Compressing...
                        </span>
                      )}
                      {item.status === "uploading" && (
                        <span className="flex items-center gap-1 text-[var(--color-brand-600)] font-medium">
                          <Loader2 className="h-3 w-3 animate-spin" /> Uploading...
                        </span>
                      )}
                      {item.status === "success" && (
                        <span className="text-[var(--color-success)] font-semibold flex items-center gap-0.5">
                          <Check className="h-3 w-3" /> Compressed & Uploaded
                        </span>
                      )}
                      {item.status === "error" && (
                        <span className="text-[var(--color-danger)] font-medium">
                          Error: {item.error}
                        </span>
                      )}

                      {/* Savings info */}
                      {item.savings !== undefined && item.savings > 0 && (
                        <span className="bg-[var(--color-brand-50)] text-[var(--color-brand-700)] px-1.5 py-0.5 rounded-md font-semibold">
                          -{item.savings}% size ({formatBytes(item.compressedSize!)})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-16 text-right font-medium text-[var(--text-secondary)]">
                    {item.status === "success" ? "100%" : `${item.progress}%`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Existing Photos Grid */}
        <div>
          <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-1.5">
            Uploaded Photos 
            <span className="text-xs text-[var(--text-secondary)] font-normal">({images.length})</span>
          </h4>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-[var(--text-secondary)] gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--color-brand-600)]" />
              <span className="text-xs">Loading photo gallery...</span>
            </div>
          ) : images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 border border-dashed border-[var(--border-default)] rounded-2xl bg-[var(--bg-subtle)]/30 text-center px-4">
              <ImageIcon className="h-8 w-8 text-[var(--text-muted)] mb-2" />
              <p className="text-xs font-semibold text-[var(--text-primary)]">No photos uploaded yet</p>
              <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Images will show up here once uploaded</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {images.map((img) => (
                <div 
                  key={img.id}
                  className={`group relative aspect-video rounded-2xl overflow-hidden border bg-[var(--bg-subtle)]/50 transition-all duration-300 ${
                    img.is_featured 
                      ? "border-2 border-[var(--color-brand-500)] ring-4 ring-[var(--color-brand-50)]/50 shadow-md" 
                      : "border-[var(--border-default)] hover:border-[var(--border-strong)] hover:shadow-sm"
                  }`}
                >
                  <img
                    src={getMediaUrl(img.storage_path)}
                    alt={img.alt_text || "Venue photo"}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Badges/Overlays */}
                  {img.is_featured && (
                    <div className="absolute top-2 left-2 z-10">
                      <Badge className="bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-600)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                        <Star className="h-3 w-3 fill-current" />
                        Featured
                      </Badge>
                    </div>
                  )}

                  {/* Dark hover overlay with action buttons */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                    {!img.is_featured && (
                      <Button
                        type="button"
                        onClick={() => handleSetFeatured(img.id)}
                        className="h-8 w-8 rounded-full bg-white text-slate-800 hover:bg-slate-100 p-0 flex items-center justify-center shadow-md transition-transform hover:scale-105"
                        title="Make featured"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={() => handleDeleteImage(img)}
                      className="h-8 w-8 rounded-full bg-red-600 text-white hover:bg-red-700 p-0 flex items-center justify-center shadow-md transition-transform hover:scale-105 border-none"
                      title="Delete image"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
