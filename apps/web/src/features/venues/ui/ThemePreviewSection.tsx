"use client";

import { useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import { Sparkles, Loader2, Info, Wand2 } from "lucide-react";
import {
  CUSTOM_THEME,
  MAX_CUSTOM_PROMPT_LENGTH,
  sanitizeCustomPrompt,
  venueThemeOptions,
  type ThemeSelection,
} from "@venora/lib";
import { isOptimizableImageSrc } from "@/src/lib/image-host";
import { useThemePreview, type ThemeRequest } from "../hooks/use-theme-preview";
import { getVenueMediaUrl, pickFeaturedMedia } from "../utils/venue-media";
import type { VenueMedia } from "../types/venue.types";

interface ThemePreviewSectionProps {
  venueId: string;
  venueName: string;
  media: VenueMedia[];
  /**
   * Resolved URL of the hero image the customer actually sees. For venues on
   * the structured profile system this comes from `venue_media_items`, not
   * `venue_images`, so it is the only reliable way to know which photo is on
   * screen. Optional: venues without a structured profile pass nothing.
   */
  heroImageSrc?: string | null;
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function ThemePreviewSection({
  venueId,
  venueName,
  media = [],
  heroImageSrc = null,
}: ThemePreviewSectionProps) {
  const [request, setRequest] = useState<ThemeRequest | null>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [customDraft, setCustomDraft] = useState("");

  // v1 themes a single photo, and only real Storage-backed rows — the dataset
  // fallback venues have no venue_images records to reference.
  //
  // Which photo matters: on the structured profile system the hero the
  // customer sees comes from venue_media_items, while venue_theme_previews
  // keys on venue_images. Those are different tables holding the same files,
  // so we match the hero back to its venue_images twin by resolved URL. That
  // themes the photo actually on screen while keeping the source_image_id
  // foreign key intact. Legacy venues (no structured hero, or a hero with no
  // venue_images twin) fall back to the featured venue_images row.
  const featuredPhoto = useMemo(() => {
    const images = media.filter((item) => item.media_type === "image");
    const heroMatch = heroImageSrc
      ? images.find(
          (item) => getVenueMediaUrl(item.storage_path) === heroImageSrc,
        )
      : undefined;
    // Residual gap: a structured hero with no matching venue_images
    // storage_path silently falls back here, reintroducing the very mismatch
    // this logic fixes. Closing it needs source_image_id to reference
    // venue_media_items, i.e. a migration — see docs/modules/ai-theme-preview.md.
    return heroMatch ?? pickFeaturedMedia(images);
  }, [media, heroImageSrc]);

  const canPreview =
    Boolean(featuredPhoto) &&
    uuidPattern.test(featuredPhoto!.id) &&
    uuidPattern.test(venueId);

  const { data, isFetching, isError, error } = useThemePreview(
    venueId,
    featuredPhoto?.id ?? "",
    canPreview ? request : null,
  );

  if (!canPreview || !featuredPhoto) return null;

  const originalUrl = getVenueMediaUrl(featuredPhoto.storage_path);
  const preview = data?.preview;
  const themedUrl = preview?.status === "ready" ? preview.url : null;

  const selectedTheme: ThemeSelection | null = request?.theme ?? null;
  const activeLabel =
    selectedTheme === CUSTOM_THEME
      ? (request?.customPrompt ?? "Custom")
      : venueThemeOptions.find((option) => option.value === selectedTheme)
          ?.label;

  // Anything short of a finished render falls back to the original photo.
  const isGenerating =
    Boolean(request) && (isFetching || preview?.status === "pending");
  const isUnavailable =
    Boolean(request) &&
    !isGenerating &&
    (isError || preview?.status === "failed" || !themedUrl);

  // Rate limiting is the one failure worth naming — "try again" is useless
  // advice when the answer is "wait, or pick a ready-made theme".
  const isRateLimited =
    isError && (error as { code?: string } | null)?.code === "RATE_LIMITED";

  const select = (next: ThemeRequest | null) => {
    setRequest(next);
    setSliderPosition(50);
  };

  const handleCustomSubmit = (event: FormEvent) => {
    event.preventDefault();
    const sanitized = sanitizeCustomPrompt(customDraft);
    if (!sanitized) return;
    select({ theme: CUSTOM_THEME, customPrompt: sanitized });
  };

  const customIsReady = Boolean(sanitizeCustomPrompt(customDraft));

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h3 className="font-sora flex items-center gap-2 text-xl font-bold tracking-tight text-[var(--text-primary)]">
          <Sparkles className="h-5 w-5 text-[#2563EB]" />
          Preview with AI Theme
        </h3>
        <p className="text-xs font-medium text-[var(--text-muted)]">
          See {venueName} restyled for your event. The space stays the same —
          only the mood changes.
        </p>
      </div>

      {/* Theme chips */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => select(null)}
          aria-pressed={selectedTheme === null}
          className={`rounded-2xl border px-4 py-2 text-xs font-bold transition-all ${
            selectedTheme === null
              ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8]"
              : "border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
          }`}
        >
          Original
        </button>

        {venueThemeOptions.map((option) => {
          const isActive = selectedTheme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                select({ theme: option.value, customPrompt: null })
              }
              aria-pressed={isActive}
              disabled={isGenerating && !isActive}
              className={`flex items-center gap-1.5 rounded-2xl border px-4 py-2 text-xs font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                isActive
                  ? "border-[#2563EB] bg-[#EFF6FF] text-[#1D4ED8]"
                  : "border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#BFDBFE] hover:bg-[#EFF6FF] hover:text-[#1D4ED8]"
              }`}
            >
              <span aria-hidden="true">{option.icon}</span>
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Describe your own theme */}
      <form
        onSubmit={handleCustomSubmit}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <div className="relative flex-1">
          <Wand2 className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={customDraft}
            onChange={(event) => setCustomDraft(event.target.value)}
            maxLength={MAX_CUSTOM_PROMPT_LENGTH}
            placeholder="Or describe your own — e.g. “neon cyberpunk night with purple haze”"
            aria-label="Describe your own theme"
            className="h-11 w-full rounded-2xl border border-[#E5E7EB] bg-white pr-4 pl-10 text-sm font-medium text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#2563EB] focus:ring-2 focus:ring-[#BFDBFE] focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={!customIsReady || isGenerating}
          className="h-11 shrink-0 rounded-2xl bg-[#2563EB] px-5 text-xs font-bold text-white transition-all hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Generate
        </button>
      </form>

      {/* Comparison viewport */}
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-3xl border border-[var(--border-default)] bg-slate-100">
        {/* Themed render sits underneath; the original is clipped over it. */}
        {themedUrl && (
          <Image
            src={themedUrl}
            alt={`${venueName} styled as ${activeLabel ?? "a theme"}`}
            fill
            unoptimized={!isOptimizableImageSrc(themedUrl)}
            sizes="(max-width: 1024px) 100vw, 66vw"
            className="object-cover"
          />
        )}

        <div
          className="absolute inset-0"
          style={
            themedUrl
              ? { clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }
              : undefined
          }
        >
          <Image
            src={originalUrl}
            alt={featuredPhoto.alt_text || venueName}
            fill
            unoptimized={!isOptimizableImageSrc(originalUrl)}
            sizes="(max-width: 1024px) 100vw, 66vw"
            className="object-cover"
          />
        </div>

        {themedUrl && (
          <>
            {/* Divider handle — decorative; the range input below drives it. */}
            <div
              className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.35)]"
              style={{ left: `${sliderPosition}%` }}
            >
              <div className="absolute top-1/2 left-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/90 text-[10px] font-black text-[#1D4ED8] shadow-lg">
                ↔
              </div>
            </div>

            <input
              type="range"
              min={0}
              max={100}
              value={sliderPosition}
              onChange={(event) =>
                setSliderPosition(Number(event.target.value))
              }
              aria-label={`Compare the original photo with the ${activeLabel ?? "themed"} preview`}
              className="absolute inset-0 z-20 h-full w-full cursor-ew-resize opacity-0"
            />

            <span className="pointer-events-none absolute bottom-3 left-3 z-10 rounded-full bg-black/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
              Original
            </span>
            <span className="pointer-events-none absolute right-3 bottom-3 z-10 max-w-[60%] truncate rounded-full bg-[#2563EB]/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
              {activeLabel}
            </span>
          </>
        )}

        {isGenerating && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-2 bg-white/70 px-6 text-center backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-[#2563EB]" />
            <p className="line-clamp-2 text-sm font-bold text-[var(--text-primary)]">
              Rendering {activeLabel}…
            </p>
            <p className="text-xs font-medium text-[var(--text-muted)]">
              This takes a few seconds the first time.
            </p>
          </div>
        )}
      </div>

      {isUnavailable && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
          <Info className="h-3.5 w-3.5 shrink-0" />
          {isRateLimited
            ? "You've used up your custom previews for now — the ready-made themes still work. Showing the original."
            : "Preview unavailable, showing original."}
        </p>
      )}
    </section>
  );
}
