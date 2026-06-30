"use client";

import { useState } from "react";
import Image from "next/image";
import { Grid, Play, X, ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogClose, Button } from "@venora/ui";

interface VenueMedia {
  id: string;
  storage_path: string;
  media_type: "image" | "video";
  alt_text: string | null;
  display_order: number;
  is_featured: boolean;
}

interface VenueGalleryProps {
  media: VenueMedia[];
  venueName: string;
}

export default function VenueGallery({ media = [], venueName }: VenueGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://szmjjkywcsnzkgqevinz.supabase.co";

  const getMediaUrl = (path: string) => {
    if (path.startsWith("http") || path.startsWith("/")) return path;
    return `${supabaseUrl}/storage/v1/object/public/venue-images/${path}`;
  };

  // Sort media by display order
  const sortedMedia = [...media].sort((a, b) => a.display_order - b.display_order);

  // If no media is uploaded, display a fallback
  if (sortedMedia.length === 0) {
    return (
      <div className="h-[350px] md:h-[450px] w-full rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 border border-[var(--border-default)] flex flex-col items-center justify-center text-center p-4">
        <ImageIcon className="h-10 w-10 text-[var(--text-muted)] mb-2" />
        <p className="text-sm font-semibold text-[var(--text-primary)]">No photos uploaded yet</p>
      </div>
    );
  }

  const featured = sortedMedia.find((m) => m.is_featured) || sortedMedia[0];
  if (!featured) return null;
  const gridMedia = sortedMedia.filter((m) => m.id !== featured.id).slice(0, 4);

  const openLightbox = (index: number) => {
    setActiveIndex(index);
    setLightboxOpen(true);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? sortedMedia.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev === sortedMedia.length - 1 ? 0 : prev + 1));
  };

  const activeMedia = sortedMedia[activeIndex];
  if (!activeMedia) return null;

  return (
    <div className="space-y-4">
      {/* Grid Layout (Airbnb inspired) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 h-[300px] md:h-[450px] w-full rounded-3xl overflow-hidden border border-[var(--border-default)] relative group">
        {/* Left Featured Block */}
        <div
          onClick={() => openLightbox(sortedMedia.indexOf(featured))}
          className="md:col-span-2 h-full relative overflow-hidden cursor-pointer bg-slate-100"
        >
          <Image
            src={getMediaUrl(featured.storage_path)}
            alt={featured.alt_text || venueName}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover hover:scale-[1.03] transition-transform duration-500"
          />
          {featured.media_type === "video" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="h-14 w-14 rounded-full bg-white/90 shadow-xl flex items-center justify-center text-[var(--color-brand-600)] hover:scale-110 transition-transform">
                <Play className="h-6 w-6 fill-current translate-x-0.5" />
              </div>
            </div>
          )}
        </div>

        {/* Right Smaller Blocks (Hidden on mobile) */}
        <div className="hidden md:grid grid-cols-2 col-span-2 gap-3 h-full">
          {Array.from({ length: 4 }).map((_, i) => {
            const item = gridMedia[i];
            if (!item) {
              return (
                <div
                  key={`empty-${i}`}
                  className="bg-slate-50 border border-dashed border-[var(--border-default)] rounded-xl flex items-center justify-center"
                >
                  <ImageIcon className="h-5 w-5 text-slate-300" />
                </div>
              );
            }

            return (
              <div
                key={item.id}
                onClick={() => openLightbox(sortedMedia.indexOf(item))}
                className="relative overflow-hidden cursor-pointer bg-slate-100 h-full w-full"
              >
                <Image
                  src={getMediaUrl(item.storage_path)}
                  alt={item.alt_text || `${venueName} photo`}
                  fill
                  sizes="25vw"
                  className="object-cover hover:scale-[1.05] transition-transform duration-500"
                />
                {item.media_type === "video" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="h-10 w-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-[var(--color-brand-600)]">
                      <Play className="h-4 w-4 fill-current translate-x-0.5" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Show all photos button */}
        <Button
          onClick={() => openLightbox(0)}
          variant="outline"
          className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm border-[var(--border-default)] text-[var(--text-primary)] hover:bg-white rounded-xl h-10 px-4 font-semibold shadow-md flex items-center gap-2 text-xs"
        >
          <Grid className="h-4 w-4" />
          Show all photos
        </Button>
      </div>

      {/* Lightbox / Media Viewer Dialog */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-[100vw] h-[100vh] border-none bg-black/95 p-0 sm:rounded-none flex flex-col justify-between items-center text-white">
          {/* Header Controls */}
          <div className="w-full flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent z-50">
            <span className="text-sm font-semibold tracking-wide">
              {activeIndex + 1} / {sortedMedia.length}
            </span>
            <DialogClose asChild>
              <Button
                variant="outline"
                className="h-10 w-10 border-white/20 bg-white/10 hover:bg-white/20 text-white rounded-full p-0 flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>

          {/* Main Showcase Panel */}
          <div className="flex-1 w-full flex items-center justify-center px-4 relative max-h-[80vh]">
            {/* Left Nav Button */}
            <button
              onClick={handlePrev}
              className="absolute left-4 z-50 h-12 w-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            {/* Content Player */}
            <div className="w-full max-w-5xl h-full flex items-center justify-center p-4 relative">
              {activeMedia.media_type === "video" ? (
                <video
                  src={getMediaUrl(activeMedia.storage_path)}
                  controls
                  autoPlay
                  className="max-w-full max-h-full rounded-2xl shadow-2xl"
                />
              ) : (
                <div className="relative w-full h-full max-h-[70vh] flex items-center justify-center">
                  <img
                    src={getMediaUrl(activeMedia.storage_path)}
                    alt={activeMedia.alt_text || "Venue media"}
                    className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl"
                  />
                </div>
              )}
            </div>

            {/* Right Nav Button */}
            <button
              onClick={handleNext}
              className="absolute right-4 z-50 h-12 w-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          {/* Footer Thumbnails Scrollbar */}
          <div className="w-full bg-black/60 p-4 overflow-x-auto flex justify-center gap-3">
            {sortedMedia.map((m, idx) => (
              <div
                key={m.id}
                onClick={() => setActiveIndex(idx)}
                className={`relative h-14 w-20 rounded-xl overflow-hidden cursor-pointer border-2 transition-all flex-shrink-0 ${
                  idx === activeIndex ? "border-[var(--color-brand-500)] scale-105" : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img
                  src={getMediaUrl(m.storage_path)}
                  alt="Thumbnail"
                  className="h-full w-full object-cover"
                />
                {m.media_type === "video" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Play className="h-3 w-3 fill-white text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
