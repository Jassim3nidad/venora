"use client";

import { useState, useRef, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ZoomIn, ZoomOut, Check } from "lucide-react";

type ImageCropperModalProps = {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  aspectRatio?: number; // width / height, e.g., 1 for square, 16/9 for cover
  onCropSubmit: (croppedBlob: Blob) => void;
};

export function ImageCropperModal({
  isOpen,
  onClose,
  imageUrl,
  aspectRatio = 1,
  onCropSubmit,
}: ImageCropperModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const offsetStart = useRef({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [announcement, setAnnouncement] = useState("");

  // Reset state when opening a new image
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [isOpen, imageUrl]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setImgSize({ width: naturalWidth, height: naturalHeight });
    setOffset({ x: 0, y: 0 }); // reset offset on load to center
    setAnnouncement("Image loaded. Use arrow keys to adjust crop.");
  };

  // Calculate scaling and bounds
  let containerW = 0;
  let containerH = 0;
  let baseScale = 1;
  let currentScale = 1;
  let minX = 0;
  let minY = 0;
  let dw = 0;
  let dh = 0;

  if (containerRef.current && imgSize.width > 0) {
    containerW = containerRef.current.clientWidth;
    containerH = containerRef.current.clientHeight;

    baseScale = Math.max(
      containerW / imgSize.width,
      containerH / imgSize.height,
    );
    currentScale = baseScale * zoom;

    dw = imgSize.width * currentScale;
    dh = imgSize.height * currentScale;

    minX = containerW - dw;
    minY = containerH - dh;
  }

  // Constrain offset
  const clampedX = Math.min(0, Math.max(minX, offset.x));
  const clampedY = Math.min(0, Math.max(minY, offset.y));

  // If bounds change due to zoom and current offset is out of bounds, adjust it smoothly
  useEffect(() => {
    if (offset.x !== clampedX || offset.y !== clampedY) {
      setOffset({ x: clampedX, y: clampedY });
    }
  }, [clampedX, clampedY, offset.x, offset.y]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    offsetStart.current = { x: clampedX, y: clampedY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset({
      x: offsetStart.current.x + dx,
      y: offsetStart.current.y + dy,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const resetCrop = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setAnnouncement("Crop position and zoom reset.");
    containerRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const STEP = 20;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
      let dx = 0;
      let dy = 0;
      if (e.key === "ArrowLeft") dx = -STEP;
      if (e.key === "ArrowRight") dx = STEP;
      if (e.key === "ArrowUp") dy = -STEP;
      if (e.key === "ArrowDown") dy = STEP;

      const newX = offset.x - dx;
      const newY = offset.y - dy;

      setOffset({ x: newX, y: newY });
      setAnnouncement(`Crop adjusted. Zoom level: ${zoom}x.`);
    }
  };

  const handleCrop = async () => {
    if (!imageRef.current || !containerRef.current) return;

    const canvas = document.createElement("canvas");
    // Target output size based on container width but higher resolution
    // E.g. we want at least 800px width for quality
    const outW = 800;
    const outH = outW / aspectRatio;

    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // source coords
    const sx = -clampedX / currentScale;
    const sy = -clampedY / currentScale;
    const sWidth = containerW / currentScale;
    const sHeight = containerH / currentScale;

    ctx.drawImage(imageRef.current, sx, sy, sWidth, sHeight, 0, 0, outW, outH);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          setAnnouncement("Image successfully cropped.");
          onCropSubmit(blob);
        }
      },
      "image/jpeg",
      0.9,
    );
  };

  // Center image initially if offset is 0,0
  const initialOffsetX = (containerW - dw) / 2;
  const initialOffsetY = (containerH - dh) / 2;
  const finalX = offset.x === 0 ? initialOffsetX : clampedX;
  const finalY = offset.y === 0 ? initialOffsetY : clampedY;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-[100] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-2xl bg-white shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:w-[90vw]">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <Dialog.Title className="text-lg font-bold text-slate-800">
              Crop Image
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              Adjust your image before uploading. Use arrow keys to move the
              crop area.
            </Dialog.Description>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close image cropper"
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="p-6">
            <div className="flex flex-col items-center">
              {/* Cropper Container */}
              <div
                ref={containerRef}
                tabIndex={0}
                role="region"
                aria-label="Image cropping area"
                aria-describedby="crop-keyboard-instructions"
                className="relative w-full touch-none cursor-move overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-inner focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                style={{
                  aspectRatio: aspectRatio,
                  maxHeight: "60vh",
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onKeyDown={handleKeyDown}
              >
                <p id="crop-keyboard-instructions" className="sr-only">
                  Use the arrow keys to move the image within the crop area. Use
                  the zoom slider or Reset crop button to adjust the view.
                </p>
                {imageUrl && (
                  <img
                    ref={imageRef}
                    src={imageUrl}
                    alt="Crop source"
                    onLoad={handleImageLoad}
                    className="pointer-events-none absolute max-w-none"
                    style={{
                      width: imgSize.width ? `${dw}px` : "auto",
                      height: imgSize.height ? `${dh}px` : "auto",
                      transform: `translate3d(${finalX}px, ${finalY}px, 0)`,
                      willChange: "transform",
                    }}
                    draggable={false}
                  />
                )}

                {/* Crop Overlay Guidelines */}
                <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30">
                  <div className="border-b border-r border-white"></div>
                  <div className="border-b border-r border-white"></div>
                  <div className="border-b border-white"></div>
                  <div className="border-b border-r border-white"></div>
                  <div className="border-b border-r border-white"></div>
                  <div className="border-b border-white"></div>
                  <div className="border-r border-white"></div>
                  <div className="border-r border-white"></div>
                  <div></div>
                </div>
              </div>

              {/* Zoom Controls */}
              <div className="mt-6 flex w-full items-center gap-4 px-2">
                <ZoomOut
                  aria-hidden="true"
                  className="h-5 w-5 text-slate-500"
                />
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={zoom}
                  onChange={(e) => {
                    setZoom(parseFloat(e.target.value));
                    setAnnouncement(`Zoom level: ${e.target.value}x.`);
                  }}
                  aria-label="Zoom image"
                  className="h-2 flex-1 appearance-none rounded-full bg-slate-200 accent-[#2563EB]"
                />
                <ZoomIn aria-hidden="true" className="h-5 w-5 text-slate-500" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <button
              type="button"
              onClick={resetCrop}
              className="mr-auto h-10 rounded-lg px-4 text-sm font-bold text-[#1D4ED8] transition-colors hover:bg-[#DBEAFE]"
            >
              Reset crop
            </button>
            <Dialog.Close asChild>
              <button
                type="button"
                className="h-10 rounded-lg px-4 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={handleCrop}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-6 text-sm font-black text-white shadow-sm transition hover:bg-[#1D4ED8]"
            >
              <Check className="h-4 w-4" />
              Crop & Upload
            </button>
          </div>
          <div className="sr-only" aria-live="polite">
            {announcement}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
