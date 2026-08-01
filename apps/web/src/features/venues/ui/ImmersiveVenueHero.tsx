"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  Heart,
  MapPin,
  Pause,
  Play,
  Share2,
  ShieldCheck,
  Star,
} from "lucide-react";
import {
  Button,
  Toast,
  ToastDescription,
  ToastTitle,
} from "@venora/ui";
import { useAuthRequiredPrompt } from "@/components/layout/AuthRequiredPrompt";
import { isOptimizableImageSrc } from "@/src/lib/image-host";
import type { PublicVenueProfileViewModel } from "../application/public-venue-profile";
import { toggleFavoriteAction } from "../application/actions";

const SECTION_LABELS: Record<string, string> = {
  overview: "Overview",
  spaces: "Spaces",
  experiences: "Event types",
  gallery: "Gallery",
  packages: "Packages",
  practical: "Practical details",
  faqs: "FAQs",
  reviews: "Reviews",
};

export type ImmersiveSectionLink = { id: string; label: string; href: string };

export function getImmersiveSectionLinks(
  sections: string[],
  renderedSections: string[] = sections,
): ImmersiveSectionLink[] {
  const rendered = new Set(renderedSections);
  return sections
    .filter((section) => rendered.has(section) && SECTION_LABELS[section])
    .map((section) => ({
      id: section,
      label: SECTION_LABELS[section]!,
      href: `#${section}`,
    }));
}

export function shouldPlayHeroVideo(
  hasVideo: boolean,
  prefersReducedMotion: boolean,
  videoFailed: boolean,
) {
  return hasVideo && !prefersReducedMotion && !videoFailed;
}

interface ImmersiveVenueHeroProps {
  profile: PublicVenueProfileViewModel;
  initialIsFavorited: boolean;
  currentUser: { id?: string } | null;
  isOwnVenue?: boolean;
}

export default function ImmersiveVenueHero({
  profile,
  initialIsFavorited,
  currentUser,
  isOwnVenue = false,
}: ImmersiveVenueHeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(true);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState({
    title: "",
    description: "",
  });
  const { openAuthPrompt, authPrompt } = useAuthRequiredPrompt(
    profile.actions.venueHref,
    "favorites",
  );

  const heroVideo = profile.hero.video;
  const heroImage = profile.hero.image;
  const canPlayVideo = shouldPlayHeroVideo(
    Boolean(heroVideo),
    prefersReducedMotion,
    videoFailed,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !canPlayVideo) {
      video?.pause();
      setVideoPlaying(false);
      return;
    }

    void video
      .play()
      .then(() => setVideoPlaying(true))
      .catch(() => setVideoPlaying(false));
  }, [canPlayVideo]);

  const triggerToast = (title: string, description: string) => {
    setToastMessage({ title, description });
    setToastOpen(true);
  };

  const handleFavoriteToggle = async () => {
    if (!currentUser) {
      openAuthPrompt(profile.actions.venueHref);
      return;
    }

    setIsFavorited((previous) => !previous);
    setIsTogglingFavorite(true);
    const result = await toggleFavoriteAction({ venueId: profile.venue.id });
    setIsTogglingFavorite(false);

    if (result.error) {
      setIsFavorited((previous) => !previous);
      triggerToast("Unable to update favorites", result.error.message);
      return;
    }

    triggerToast(
      result.data.isFavorited ? "Saved to Favorites" : "Removed from Favorites",
      result.data.isFavorited
        ? "You can find this venue in your saved list."
        : "This venue has been removed from your saved list.",
    );
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: profile.venue.name,
          url: window.location.href,
        });
        return;
      }
      await navigator.clipboard.writeText(window.location.href);
      triggerToast("Link copied", "The venue link is ready to share.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      triggerToast("Unable to share", "Copy the page address from your browser.");
    }
  };

  const toggleVideo = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try {
        await video.play();
        setVideoPlaying(true);
      } catch {
        setVideoPlaying(false);
      }
    } else {
      video.pause();
      setVideoPlaying(false);
    }
  };

  return (
    <>
      <section
        aria-labelledby="venue-title"
        className="relative isolate min-h-[72dvh] overflow-hidden bg-[#18201D] text-white sm:min-h-[78dvh] lg:min-h-[86dvh]"
      >
        {heroImage ? (
          <Image
            src={heroImage.src}
            alt={heroImage.altText}
            fill
            priority
            unoptimized={!isOptimizableImageSrc(heroImage.src)}
            sizes="100vw"
            className="object-cover"
          />
        ) : null}

        {heroVideo && !videoFailed ? (
          <video
            ref={videoRef}
            muted
            loop
            playsInline
            preload="metadata"
            poster={heroImage?.src}
            aria-label={`${profile.venue.name} venue video`}
            onError={() => setVideoFailed(true)}
            onPause={() => setVideoPlaying(false)}
            onPlay={() => setVideoPlaying(true)}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 motion-reduce:transition-none ${
              canPlayVideo && videoPlaying ? "opacity-100" : "opacity-0"
            }`}
          >
            <source src={heroVideo.src} />
          </video>
        ) : null}

        <div className="absolute inset-0 bg-black/50" aria-hidden="true" />

        <div className="relative mx-auto flex min-h-[72dvh] max-w-7xl flex-col justify-end px-4 pb-7 pt-28 sm:min-h-[78dvh] sm:px-6 sm:pb-10 lg:min-h-[86dvh] lg:px-8 lg:pb-12">
          <div className="max-w-4xl">
            <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-white/90">
              {profile.venue.verified ? (
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-300" />
                  Verified venue
                </span>
              ) : null}
              {profile.venue.locationLabel ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {profile.venue.locationLabel}
                </span>
              ) : null}
              <a
                href="#reviews"
                className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
              >
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {profile.rating.average.toFixed(1)} ({profile.rating.count} review
                {profile.rating.count === 1 ? "" : "s"})
              </a>
            </div>

            <h1
              id="venue-title"
              className="max-w-4xl break-words text-4xl font-bold leading-[1.04] tracking-[-0.035em] sm:text-6xl lg:text-7xl"
            >
              {profile.venue.name}
            </h1>
            {profile.venue.shortDescription ? (
              <p className="mt-5 line-clamp-6 max-w-2xl text-base leading-7 text-white/88 sm:line-clamp-4 sm:text-lg sm:leading-8">
                {profile.venue.shortDescription}
              </p>
            ) : null}

            <div className="mt-7 flex flex-wrap gap-3">
              {!isOwnVenue ? (
                <a
                  href="#booking"
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-5 text-sm font-bold text-[#151C27] transition-colors hover:bg-white/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  Request availability
                </a>
              ) : null}
              <a
                href="#overview"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/55 bg-black/20 px-5 text-sm font-bold text-white transition-colors hover:bg-black/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Explore venue
                <ArrowDown className="h-4 w-4" />
              </a>
              <Button
                type="button"
                onClick={() => void handleShare()}
                variant="outline"
                className="h-11 rounded-lg border-white/55 bg-black/20 px-4 text-white hover:bg-black/35 hover:text-white"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              {!isOwnVenue ? (
                <Button
                  type="button"
                  onClick={() => void handleFavoriteToggle()}
                  variant="outline"
                  disabled={isTogglingFavorite}
                  aria-pressed={isFavorited}
                  className="h-11 rounded-lg border-white/55 bg-black/20 px-4 text-white hover:bg-black/35 hover:text-white"
                >
                  <Heart
                    className={`mr-2 h-4 w-4 ${isFavorited ? "fill-current" : ""}`}
                  />
                  {isFavorited ? "Saved" : "Save"}
                </Button>
              ) : null}
            </div>
          </div>

          {profile.quickFacts.length > 0 ? (
            <dl className="mt-8 grid max-w-5xl grid-cols-2 border-t border-white/35 pt-5 sm:grid-cols-4">
              {profile.quickFacts.map((fact) => (
                <div
                  key={fact.key}
                  className="min-w-0 border-white/25 py-2 pr-4 sm:border-l sm:px-5 sm:first:border-l-0 sm:first:pl-0"
                >
                  <dt className="text-xs font-semibold text-white/70">{fact.label}</dt>
                  <dd className="mt-1 break-words text-sm font-bold text-white sm:text-base">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        {heroVideo && !videoFailed ? (
          <button
            type="button"
            onClick={() => void toggleVideo()}
            className="absolute right-4 top-5 inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/50 bg-black/45 px-4 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-black/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:right-6 lg:right-8"
            aria-label={videoPlaying ? "Pause venue video" : "Play venue video"}
          >
            {videoPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span className="hidden sm:inline">{videoPlaying ? "Pause" : "Play"}</span>
          </button>
        ) : null}
      </section>

      {toastOpen ? (
        <Toast onOpenChange={setToastOpen}>
          <div className="flex flex-col gap-1">
            <ToastTitle>{toastMessage.title}</ToastTitle>
            <ToastDescription>{toastMessage.description}</ToastDescription>
          </div>
        </Toast>
      ) : null}
      {authPrompt}
    </>
  );
}

export function ImmersiveVenueSectionNav({
  links,
}: {
  links: ImmersiveSectionLink[];
}) {
  if (links.length < 2) return null;

  return (
    <nav
      aria-label="Venue page sections"
      className="sticky top-[4.25rem] z-30 border-b border-[#E2E2DE] bg-[#F7F5F1]/95 backdrop-blur lg:top-[8.5rem]"
    >
      <div className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-4 sm:px-6 lg:px-8">
        {links.map((link) => (
          <a
            key={link.id}
            href={link.href}
            className="inline-flex min-h-12 shrink-0 items-center border-b-2 border-transparent text-sm font-semibold text-[#5C625E] transition-colors hover:border-[#151C27] hover:text-[#151C27] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-[#0052CC]"
          >
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
