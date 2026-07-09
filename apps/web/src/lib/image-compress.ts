type CompressionResult = {
  file: File;
  originalSize: number;
  compressedSize: number;
};

export function compressImageForAvatar(
  file: File,
  size = 512,
  quality = 0.85,
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Could not load image."));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not process image."));
          return;
        }

        const sourceSize = Math.min(img.width, img.height);
        const sourceX = (img.width - sourceSize) / 2;
        const sourceY = (img.height - sourceSize) / 2;

        ctx.drawImage(
          img,
          sourceX,
          sourceY,
          sourceSize,
          sourceSize,
          0,
          0,
          size,
          size,
        );

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Image compression failed."));
              return;
            }

            const compressedFile = new File([blob], "avatar.jpg", {
              type: "image/jpeg",
            });

            resolve({
              file: compressedFile,
              originalSize: file.size,
              compressedSize: blob.size,
            });
          },
          "image/jpeg",
          quality,
        );
      };
      img.src = event.target?.result as string;
    };
  });
}
