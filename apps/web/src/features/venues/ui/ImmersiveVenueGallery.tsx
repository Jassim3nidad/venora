"use client";

import { useEffect, useMemo, useRef, useState, type TouchEvent } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  Images,
  Play,
  X,
} from "lucide-react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@venora/ui";
import { isOptimizableImageSrc } from "@/src/lib/image-host";
import type {
  PublicVenueMedia,
  PublicVenueSpace,
} from "../application/public-venue-profile";

export type VenueMediaGroup = {
  key: string;
  title: string;
  media: PublicVenueMedia[];
};

export function groupVenueMedia(
  media: PublicVenueMedia[],
  spaces: PublicVenueSpace[],
): VenueMediaGroup[] {
  const spaceNames = new Map(spaces.map((space) => [space.key, space.name]));
  const groups = new Map<string, VenueMediaGroup>();

  for (const item of media) {
    const title =
      item.collectionTitle ??
      (item.spaceKey ? spaceNames.get(item.spaceKey) : null) ??
      "Venue gallery";
    const key = title.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-");
    const group = groups.get(key) ?? { key, title, media: [] };
    group.media.push(item);
    groups.set(key, group);
  }

  return [...groups.values()];
}

function GalleryMedia({
  item,
  sizes,
}: {
  item: PublicVenueMedia;
  sizes: string;
}) {
  if (item.mediaType === "video") {
    return (
      <>
        <video
          src={item.src}
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
          className="h-full w-full object-cover"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/20">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#151C27] shadow-lg">
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          </span>
        </span>
      </>
    );
  }

  return (
    <Image
      src={item.src}
      alt={item.altText}
      fill
      unoptimized={!isOptimizableImageSrc(item.src)}
      sizes={sizes}
      className="object-cover transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
    />
  );
}

export default function ImmersiveVenueGallery({
  media,
  spaces,
  venueName,
}: {
  media: PublicVenueMedia[];
  spaces: PublicVenueSpace[];
  venueName: string;
}) {
  const groups = useMemo(() => groupVenueMedia(media, spaces), [media, spaces]);
  const [activeGroupKey, setActiveGroupKey] = useState(groups[0]?.key ?? "");
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const activeGroup =
    groups.find((group) => group.key === activeGroupKey) ?? groups[0] ?? null;
  const activeMedia = activeGroup?.media[activeIndex] ?? null;

  const previous = () => {
    if (!activeGroup) return;
    setActiveIndex((current) =>
      current === 0 ? activeGroup.media.length - 1 : current - 1,
    );
  };
  const next = () => {
    if (!activeGroup) return;
    setActiveIndex((current) =>
      current === activeGroup.media.length - 1 ? 0 : current + 1,
    );
  };

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") previous();
      if (event.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, activeGroup]);

  if (!activeGroup || !activeMedia) return null;

  const visibleMedia = activeGroup.media.slice(0, 5);
  const openAt = (index: number, trigger: HTMLButtonElement) => {
    lastTriggerRef.current = trigger;
    setActiveIndex(index);
    setOpen(true);
  };
  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      requestAnimationFrame(() => lastTriggerRef.current?.focus());
    }
  };
  const handleTouchStart = (event: TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };
  const handleTouchEnd = (event: TouchEvent) => {
    const start = touchStartX.current;
    const end = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (start === null || end === undefined || Math.abs(start - end) < 45)
      return;
    if (start > end) next();
    else previous();
  };

  return (
    <section
      id="gallery"
      aria-labelledby="gallery-heading"
      className="scroll-mt-40 space-y-7"
    >
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold text-[#876946]">
            Published venue media
          </p>
          <h2
            id="gallery-heading"
            className="mt-2 text-3xl font-bold tracking-[-0.025em] text-[#151C27] sm:text-4xl"
          >
            See the property in detail
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#5C625E]">
            Move from the wider property into the spaces and details the venue
            has chosen to publish.
          </p>
        </div>
        {groups.length > 1 ? (
          <div
            className="flex gap-2 overflow-x-auto"
            role="group"
            aria-label="Gallery collections"
          >
            {groups.map((group) => (
              <button
                key={group.key}
                type="button"
                onClick={() => {
                  setActiveGroupKey(group.key);
                  setActiveIndex(0);
                }}
                aria-pressed={activeGroup.key === group.key}
                className={`min-h-11 shrink-0 rounded-lg border px-4 text-sm font-bold transition-colors ${
                  activeGroup.key === group.key
                    ? "border-[#151C27] bg-[#151C27] text-white"
                    : "border-[#CEC9BF] text-[#5C625E] hover:border-[#151C27]"
                }`}
              >
                {group.title}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="relative grid h-[28rem] grid-cols-2 grid-rows-2 gap-2 overflow-hidden sm:h-[36rem] lg:h-[42rem] lg:grid-cols-5">
        {visibleMedia.map((item, index) => {
          const isLead = index === 0;
          const isOnlyItem = activeGroup.media.length === 1;
          return (
            <button
              key={item.id}
              type="button"
              onClick={(event) => openAt(index, event.currentTarget)}
              aria-label={`Open ${item.mediaType === "video" ? "video" : "photo"} ${index + 1} of ${activeGroup.media.length}${item.caption ? `: ${item.caption}` : ""}`}
              className={`group relative min-h-11 overflow-hidden bg-[#E6E2DA] text-left focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-white ${
                isLead
                  ? `col-span-2 row-span-2 ${isOnlyItem ? "lg:col-span-5" : "lg:col-span-3"}`
                  : "hidden sm:block"
              } ${index > 2 ? "lg:block" : ""}`}
            >
              <GalleryMedia
                item={item}
                sizes={isLead ? "(max-width: 1024px) 100vw, 50vw" : "25vw"}
              />
              {item.caption ? (
                <span className="absolute inset-x-0 bottom-0 bg-black/60 px-4 py-3 text-sm font-semibold text-white">
                  {item.caption}
                </span>
              ) : null}
            </button>
          );
        })}
        <Button
          type="button"
          onClick={(event) => openAt(0, event.currentTarget)}
          variant="outline"
          className="absolute bottom-4 right-4 z-10 h-11 rounded-lg border-white/70 bg-white px-4 text-sm font-bold text-[#151C27] shadow-sm hover:bg-[#F7F5F1]"
        >
          <Grid3X3 className="mr-2 h-4 w-4" />
          View all {activeGroup.media.length}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex h-dvh max-h-dvh w-screen max-w-none flex-col overflow-hidden rounded-none border-0 bg-[#101412] p-0 text-white sm:rounded-none">
          <DialogTitle className="sr-only">{venueName} gallery</DialogTitle>
          <DialogDescription className="sr-only">
            Use the previous and next buttons or arrow keys to explore published
            venue media.
          </DialogDescription>

          <header className="flex min-h-16 items-center justify-between border-b border-white/15 px-4 sm:px-6">
            <div>
              <p className="text-sm font-bold">{activeGroup.title}</p>
              <p className="text-xs text-white/60">
                {activeIndex + 1} of {activeGroup.media.length}
              </p>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                aria-label="Close gallery"
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/25 text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </DialogClose>
          </header>

          <div
            className="relative flex min-h-0 flex-1 items-center justify-center px-12 py-4 sm:px-20"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {activeMedia.mediaType === "video" ? (
              <video
                key={activeMedia.id}
                src={activeMedia.src}
                controls
                playsInline
                preload="metadata"
                aria-label={activeMedia.altText}
                className="max-h-full max-w-full"
              />
            ) : (
              <div className="relative h-full w-full">
                <Image
                  key={activeMedia.id}
                  src={activeMedia.src}
                  alt={activeMedia.altText}
                  fill
                  unoptimized={!isOptimizableImageSrc(activeMedia.src)}
                  sizes="100vw"
                  className="object-contain"
                />
              </div>
            )}

            {activeGroup.media.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={previous}
                  aria-label="Previous gallery item"
                  className="absolute left-1 flex h-11 w-11 items-center justify-center rounded-lg border border-white/25 bg-black/30 hover:bg-white/10 sm:left-5"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Next gallery item"
                  className="absolute right-1 flex h-11 w-11 items-center justify-center rounded-lg border border-white/25 bg-black/30 hover:bg-white/10 sm:right-5"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            ) : null}
          </div>

          <footer className="border-t border-white/15 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <Images className="h-4 w-4 shrink-0 text-[#D1B58A]" />
              <p className="line-clamp-2 text-sm text-white/75">
                {activeMedia.caption ?? activeMedia.altText}
              </p>
            </div>
          </footer>
        </DialogContent>
      </Dialog>
    </section>
  );
}
