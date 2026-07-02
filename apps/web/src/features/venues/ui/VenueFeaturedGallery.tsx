"use client";

import { useState } from "react";
import Image from "next/image";
import { Grid, Play, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogClose, Button } from "@venora/ui";
import type { VenueMedia } from "../types/venue.types";
import {
  getVenueMediaUrl,
  pickFeaturedMedia,
  sortVenueMedia,
} from "../utils/venue-media";
import VenueGalleryPlaceholder from "./VenueGalleryPlaceholder";

interface VenueFeaturedGalleryProps {
  media: VenueMedia[];
  venueName: string;
}

export default function VenueFeaturedGallery({
  media = [],
  venueName,
}: VenueFeaturedGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const sortedMedia = sortVenueMedia(media);
  const featured = pickFeaturedMedia(sortedMedia);

  if (!featured) {
    return <VenueGalleryPlaceholder variant="hero" />;
  }

  const gridMedia = sortedMedia.filter((item) => item.id !== featured.id).slice(0, 4);

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
    <div className="space-y-3">
      {/* Mobile: single featured image (Airbnb mobile hero) */}
      <div className="relative md:hidden">
        <button
          type="button"
          onClick={() => openLightbox(sortedMedia.indexOf(featured))}
          className="relative block h-[280px] w-full overflow-hidden bg-slate-100"
        >
          <Image
            src={getVenueMediaUrl(featured.storage_path)}
            alt={featured.alt_text || venueName}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          {featured.media_type === "video" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-[var(--color-brand-600)] shadow-xl">
                <Play className="h-6 w-6 translate-x-0.5 fill-current" />
              </div>
            </div>
          )}
        </button>

        {sortedMedia.length > 1 && (
          <div className="flex gap-2 overflow-x-auto px-4 pb-1 pt-3">
            {sortedMedia.slice(0, 6).map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openLightbox(index)}
                className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg border border-[var(--border-default)]"
              >
                <Image
                  src={getVenueMediaUrl(item.storage_path)}
                  alt={item.alt_text || `${venueName} photo ${index + 1}`}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {sortedMedia.length > 1 && (
          <Button
            onClick={() => openLightbox(0)}
            variant="outline"
            className="absolute bottom-4 right-4 h-9 rounded-lg border-[var(--border-default)] bg-white/95 px-3 text-xs font-semibold shadow-md backdrop-blur-sm"
          >
            <Grid className="mr-1.5 h-4 w-4" />
            Show all
          </Button>
        )}
      </div>

      {/* Desktop: Airbnb-style photo grid */}
      <div className="relative hidden h-[450px] w-full overflow-hidden rounded-2xl border border-[var(--border-default)] md:grid md:grid-cols-4 md:gap-2">
        <button
          type="button"
          onClick={() => openLightbox(sortedMedia.indexOf(featured))}
          className="relative col-span-2 h-full overflow-hidden bg-slate-100"
        >
          <Image
            src={getVenueMediaUrl(featured.storage_path)}
            alt={featured.alt_text || venueName}
            fill
            priority
            sizes="50vw"
            className="object-cover transition-transform duration-500 hover:scale-[1.03]"
          />
          {featured.media_type === "video" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-[var(--color-brand-600)] shadow-xl">
                <Play className="h-6 w-6 translate-x-0.5 fill-current" />
              </div>
            </div>
          )}
        </button>

        <div className="col-span-2 grid h-full grid-cols-2 grid-rows-2 gap-2">
          {Array.from({ length: 4 }).map((_, index) => {
            const item = gridMedia[index];
            if (!item) {
              return <VenueGalleryPlaceholder key={`slot-${index}`} variant="slot" />;
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => openLightbox(sortedMedia.indexOf(item))}
                className="relative overflow-hidden bg-slate-100"
              >
                <Image
                  src={getVenueMediaUrl(item.storage_path)}
                  alt={item.alt_text || `${venueName} photo`}
                  fill
                  sizes="25vw"
                  className="object-cover transition-transform duration-500 hover:scale-[1.05]"
                />
                {item.media_type === "video" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[var(--color-brand-600)] shadow-lg">
                      <Play className="h-4 w-4 translate-x-0.5 fill-current" />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {sortedMedia.length > 1 && (
          <Button
            onClick={() => openLightbox(0)}
            variant="outline"
            className="absolute bottom-4 right-4 flex h-10 items-center gap-2 rounded-xl border-[var(--border-default)] bg-white/90 px-4 text-xs font-semibold text-[var(--text-primary)] shadow-md backdrop-blur-sm hover:bg-white"
          >
            <Grid className="h-4 w-4" />
            Show all photos
          </Button>
        )}
      </div>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="flex h-[100vh] max-w-[100vw] flex-col items-center justify-between border-none bg-black/95 p-0 text-white sm:rounded-none">
          <div className="z-50 flex w-full items-center justify-between bg-gradient-to-b from-black/60 to-transparent p-4">
            <span className="text-sm font-semibold tracking-wide">
              {activeIndex + 1} / {sortedMedia.length}
            </span>
            <DialogClose asChild>
              <Button
                variant="outline"
                className="flex h-10 w-10 items-center justify-center rounded-full border-white/20 bg-white/10 p-0 text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>

          <div className="relative flex max-h-[80vh] w-full flex-1 items-center justify-center px-4">
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-2 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-all hover:bg-white/20 md:left-4 md:h-12 md:w-12"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <div className="relative flex h-full w-full max-w-5xl items-center justify-center p-4">
              {activeMedia.media_type === "video" ? (
                <video
                  src={getVenueMediaUrl(activeMedia.storage_path)}
                  controls
                  autoPlay
                  className="max-h-full max-w-full rounded-2xl shadow-2xl"
                />
              ) : (
                <img
                  src={getVenueMediaUrl(activeMedia.storage_path)}
                  alt={activeMedia.alt_text || "Venue media"}
                  className="max-h-[70vh] max-w-full rounded-2xl object-contain shadow-2xl"
                />
              )}
            </div>

            <button
              type="button"
              onClick={handleNext}
              className="absolute right-2 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-all hover:bg-white/20 md:right-4 md:h-12 md:w-12"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          <div className="flex w-full justify-center gap-3 overflow-x-auto bg-black/60 p-4">
            {sortedMedia.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                  index === activeIndex
                    ? "scale-105 border-[var(--color-brand-500)]"
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img
                  src={getVenueMediaUrl(item.storage_path)}
                  alt="Thumbnail"
                  className="h-full w-full object-cover"
                />
                {item.media_type === "video" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Play className="h-3 w-3 fill-white text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
