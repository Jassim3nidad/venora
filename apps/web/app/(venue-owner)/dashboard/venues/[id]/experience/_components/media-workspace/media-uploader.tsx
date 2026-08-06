"use client";

import React, { useState, useCallback } from "react";
import { UploadCloud, Check, X, Loader2, AlertCircle } from "lucide-react";
import { ensureVenueOwnerMembershipAction } from "@/src/features/organizations/actions/organization.actions";
import { compressImage, uploadVenueAssetToStorage, createVenueAssetRecord } from "@/src/features/venues/utils/media-upload";

interface UploadingFile {
  id: string;
  name: string;
  progress: number;
  status: "compressing" | "uploading" | "success" | "error";
  error?: string;
}

interface MediaUploaderProps {
  venueId: string;
  organizationId: string;
  onUploadSuccess?: (asset: any) => void;
}

export function MediaUploader({ venueId, organizationId, onUploadSuccess }: MediaUploaderProps) {
  const [uploadQueue, setUploadQueue] = useState<UploadingFile[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const processAndUploadFiles = async (files: FileList) => {
    const fileList = Array.from(files);
    
    // Add to queue
    const newQueueItems: UploadingFile[] = fileList.map((file, idx) => ({
      id: `${file.name}-${Date.now()}-${idx}`,
      name: file.name,
      progress: 0,
      status: "compressing",
    }));

    setUploadQueue((prev) => [...prev, ...newQueueItems]);

    // Ensure authorization
    try {
      const membership = await ensureVenueOwnerMembershipAction(venueId);
      if (!membership.success) throw new Error(membership.error);
    } catch (err: any) {
      setUploadQueue((prev) =>
        prev.map((item) =>
          newQueueItems.some((n) => n.id === item.id)
            ? { ...item, status: "error", error: "Unauthorized" }
            : item
        )
      );
      return;
    }

    // Process files sequentially or in parallel (sequentially for safety here)
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const queueItem = newQueueItems[i];
      if (!file || !queueItem) continue;
      
      try {
        const compressionResult = await compressImage(file);
        
        setUploadQueue((prev) =>
          prev.map((item) => item.id === queueItem.id ? { ...item, status: "uploading", progress: 20 } : item)
        );

        const { storagePath } = await uploadVenueAssetToStorage(organizationId, venueId, compressionResult.file);
        
        setUploadQueue((prev) =>
          prev.map((item) => item.id === queueItem.id ? { ...item, progress: 70 } : item)
        );

        const record = await createVenueAssetRecord(venueId, storagePath, false, 0);

        setUploadQueue((prev) =>
          prev.map((item) => item.id === queueItem.id ? { ...item, status: "success", progress: 100 } : item)
        );
        
        if (onUploadSuccess) {
          onUploadSuccess(record);
        }
      } catch (err: any) {
        console.error("Upload failed", err);
        setUploadQueue((prev) =>
          prev.map((item) => item.id === queueItem.id ? { ...item, status: "error", error: err.message || "Upload failed" } : item)
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
  }, [venueId, organizationId, onUploadSuccess]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processAndUploadFiles(e.target.files);
    }
  };

  const activeUploads = uploadQueue.filter(item => item.status !== "success");

  return (
    <div className="space-y-4">
      <div
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 bg-gray-50 hover:bg-gray-100"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="mb-4 rounded-full bg-blue-100 p-3">
          <UploadCloud className="h-6 w-6 text-blue-600" />
        </div>
        <h4 className="text-sm font-semibold text-gray-900">
          Upload photos
        </h4>
        <p className="mt-1 text-xs text-gray-500">
          Drag files here or browse
        </p>
        <div className="mt-4 flex items-center justify-center text-xs text-gray-500 gap-1">
          <Check className="h-3.5 w-3.5" />
          <span>I confirm I own these files or have permission to use them on Venora.</span>
        </div>
        <input
          type="file"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileChange}
        />
      </div>

      {activeUploads.length > 0 && (
        <div className="space-y-2">
          {activeUploads.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 text-sm">
              <div className="flex items-center gap-3 overflow-hidden">
                {item.status === "error" ? (
                  <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
                ) : (
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin text-blue-500" />
                )}
                <div className="flex flex-col overflow-hidden">
                  <span className="truncate font-medium text-gray-900">{item.name}</span>
                  <span className="text-xs text-gray-500">
                    {item.status === "compressing" && "Compressing..."}
                    {item.status === "uploading" && "Uploading..."}
                    {item.status === "error" && (item.error || "Failed")}
                  </span>
                </div>
              </div>
              {item.status !== "error" && (
                <div className="text-xs font-medium text-gray-700">{item.progress}%</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
