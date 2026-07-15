"use client";

import { useState, useRef, useId, useEffect } from "react";
import {
  Loader2,
  Plus,
  GripVertical,
  Trash2,
  Star,
  Image as ImageIcon,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase/client";
import { ImageCropperModal } from "./ImageCropperModal";

type PortfolioImageUploaderProps = {
  imageUrls: string[];
  coverImageUrl: string | null;
  onChangeImageUrls: (urls: string[]) => void;
  onChangeCoverImageUrl: (url: string | null) => void;
  maxImages?: number;
};

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function SortableImageItem({
  url,
  isCover,
  onSetCover,
  onRemove,
}: {
  url: string;
  isCover: boolean;
  onSetCover: () => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: url });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative aspect-[4/3] overflow-hidden rounded-xl border-2 ${
        isCover ? "border-[#2563EB]" : "border-slate-200"
      } bg-slate-50`}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-2 z-10 flex h-8 w-8 cursor-grab items-center justify-center rounded-lg bg-white/90 text-slate-500 opacity-0 shadow-sm backdrop-blur-sm transition active:cursor-grabbing group-hover:opacity-100"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      <div className="absolute right-2 top-2 z-10 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
        {!isCover && (
          <button
            type="button"
            onClick={onSetCover}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-slate-500 shadow-sm backdrop-blur-sm hover:text-[#2563EB]"
            title="Set as Cover"
          >
            <Star className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-slate-500 shadow-sm backdrop-blur-sm hover:text-red-600"
          title="Remove Image"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {isCover && (
        <div className="absolute bottom-2 left-2 z-10 rounded-md bg-[#2563EB] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
          Cover
        </div>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Portfolio image"
        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
      />
    </div>
  );
}

export function PortfolioImageUploader({
  imageUrls,
  coverImageUrl,
  onChangeImageUrls,
  onChangeCoverImageUrl,
  maxImages = 12,
}: PortfolioImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const [dndId, setDndId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only set the DnD context ID on the client to prevent hydration mismatch
  useEffect(() => {
    setDndId(generatedId);
  }, [generatedId]);

  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string>("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (event.target) event.target.value = "";

    if (!file) return;
    setError(null);

    if (imageUrls.length >= maxImages) {
      setError(`You can only upload up to ${maxImages} images.`);
      return;
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError("Please choose a JPEG, PNG, or WEBP image.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("Image must be 10 MB or smaller.");
      return;
    }

    setOriginalFileName(file.name);
    setCropImageUrl(URL.createObjectURL(file));
  };

  const handleCropSubmit = async (croppedBlob: Blob) => {
    setCropImageUrl(null);
    setIsUploading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("You must be logged in.");

      const safeName =
        originalFileName.replace(/[^a-zA-Z0-9.-]/g, "") || "image.jpg";
      const storagePath = `${user.id}/portfolio-${Date.now()}-${safeName}`;

      const fileToUpload = new File([croppedBlob], safeName, {
        type: "image/jpeg",
      });

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(storagePath, fileToUpload, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw new Error(uploadError.message);

      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(storagePath);

      const newUrls = [...imageUrls, data.publicUrl];
      onChangeImageUrls(newUrls);

      if (!coverImageUrl) {
        onChangeCoverImageUrl(data.publicUrl);
      }
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = imageUrls.indexOf(active.id as string);
      const newIndex = imageUrls.indexOf(over.id as string);
      onChangeImageUrls(arrayMove(imageUrls, oldIndex, newIndex));
    }
  };

  const handleRemove = (url: string) => {
    const newUrls = imageUrls.filter((u) => u !== url);
    onChangeImageUrls(newUrls);
    if (coverImageUrl === url) {
      onChangeCoverImageUrl(newUrls.length > 0 ? (newUrls[0] ?? null) : null);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
          {error}
        </div>
      )}

      {imageUrls.length > 0 ? (
        dndId ? (
          <DndContext
            id={dndId}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={imageUrls} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {imageUrls.map((url) => (
                  <SortableImageItem
                    key={url}
                    url={url}
                    isCover={coverImageUrl === url}
                    onSetCover={() => onChangeCoverImageUrl(url ?? null)}
                    onRemove={() => handleRemove(url)}
                  />
                ))}

                {imageUrls.length < maxImages && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="group flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-slate-500 transition hover:border-[#2563EB]/40 hover:bg-[#EFF6FF] hover:text-[#2563EB] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUploading ? (
                      <Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" />
                    ) : (
                      <Plus className="h-6 w-6" />
                    )}
                    <span className="text-xs font-semibold">
                      {isUploading ? "Uploading..." : "Add Photo"}
                    </span>
                  </button>
                )}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          // Client hasn't mounted yet — show static grid without DnD
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {imageUrls.map((url) => (
              <div
                key={url}
                className="relative aspect-[4/3] overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt="Portfolio image"
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        )
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-12 text-slate-500 transition hover:border-[#2563EB]/40 hover:bg-[#EFF6FF] hover:text-[#2563EB] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
          ) : (
            <div className="rounded-full bg-white p-3 shadow-sm ring-1 ring-slate-200">
              <ImageIcon className="h-6 w-6" />
            </div>
          )}
          <div className="text-center">
            <p className="text-sm font-bold text-slate-700">
              {isUploading ? "Uploading..." : "Upload Photos"}
            </p>
            <p className="mt-1 text-xs">JPEG, PNG, or WEBP up to 10MB</p>
          </div>
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_MIME_TYPES.join(",")}
        className="hidden"
        onChange={handleFileChange}
      />

      {cropImageUrl && (
        <ImageCropperModal
          isOpen={!!cropImageUrl}
          onClose={() => setCropImageUrl(null)}
          imageUrl={cropImageUrl}
          aspectRatio={4 / 3}
          onCropSubmit={handleCropSubmit}
        />
      )}
    </div>
  );
}
