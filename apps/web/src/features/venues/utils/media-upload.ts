import { createClient } from "@/src/lib/supabase/client";

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  savings: number;
}

export const compressImage = (
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.82,
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
            const savings = Math.max(
              0,
              Math.round(
                ((originalSize - compressedSize) / originalSize) * 100,
              ),
            );

            resolve({
              file: compressedFile,
              originalSize,
              compressedSize,
              savings,
            });
          },
          "image/jpeg",
          quality,
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export async function uploadVenueAssetToStorage(
  organizationId: string,
  venueId: string,
  compressedFile: File,
): Promise<{ storagePath: string }> {
  // We use "as any" for Supabase to avoid strict type checks here
  const supabase = createClient() as any;

  const fileExt = "jpg";
  const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const storagePath = `${organizationId}/${venueId}/${uniqueFileName}`;

  const { error: uploadError } = await supabase.storage
    .from("venue-images")
    .upload(storagePath, compressedFile, {
      contentType: "image/jpeg",
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  return { storagePath };
}

export async function createVenueAssetRecord(
  venueId: string,
  storagePath: string,
  isFeatured = false,
  displayOrder = 0,
) {
  const supabase = createClient() as any;
  const { data: dbData, error: dbError } = await supabase
    .from("venue_images")
    .insert({
      venue_id: venueId,
      storage_path: storagePath,
      media_type: "image",
      display_order: displayOrder,
      is_featured: isFeatured,
    })
    .select()
    .single();

  if (dbError) {
    // Attempt rollback
    await supabase.storage.from("venue-images").remove([storagePath]);
    throw dbError;
  }

  return dbData;
}
