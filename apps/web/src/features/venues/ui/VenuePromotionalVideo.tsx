"use client";

import { Play } from "lucide-react";
import type { VenueMedia } from "@/features/venues/types/venue.types";
import { getVenueMediaUrl } from "@/features/venues/utils/venue-media";

type VenuePromotionalVideoProps = {
  video: VenueMedia;
  venueName: string;
};

export default function VenuePromotionalVideo({
  video,
  venueName,
}: VenuePromotionalVideoProps) {
  const videoUrl = getVenueMediaUrl(video.storage_path);

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
          <Play className="h-4 w-4 fill-current" />
        </div>
        <div>
          <h2 className="font-sora text-xl font-bold tracking-tight text-[var(--text-primary)]">
            Promotional Video
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            See {venueName} in action before you book.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-[var(--border-default)] bg-black shadow-sm shadow-slate-200/60">
        <video
          src={videoUrl}
          controls
          playsInline
          preload="metadata"
          className="aspect-video w-full bg-black"
        />
      </div>
    </section>
  );
}
