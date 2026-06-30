"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Heart,
  Share2,
  MapPin,
  Users,
  Compass,
  Check,
  ShieldCheck,
  Calendar,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  ParkingCircle,
  Star,
  Flame,
  Image as ImageIcon,
} from "lucide-react";
import Image from "next/image";
import { Button, Separator, Badge, Toast, ToastTitle, ToastDescription } from "@venora/ui";
import VenueGallery from "./VenueGallery";
import BookingSidebar from "./BookingSidebar";
import ReviewsSection from "./ReviewsSection";
import VenueMap from "@/src/components/VenueMap";
import { toggleFavoriteAction } from "../application/actions";

interface VenueDetailsProps {
  venue: any;
  reviews: any[];
  nearbyVenues: any[];
  initialIsFavorited: boolean;
  currentUser: any;
}

export default function VenueDetails({
  venue,
  reviews = [],
  nearbyVenues = [],
  initialIsFavorited,
  currentUser,
}: VenueDetailsProps) {
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://szmjjkywcsnzkgqevinz.supabase.co";
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState({ title: "", description: "" });

  const triggerToast = (title: string, description: string) => {
    setToastMessage({ title, description });
    setToastOpen(true);
  };

  const handleFavoriteToggle = async () => {
    if (!currentUser) {
      triggerToast("Sign In Required", "Please log in to save favorites.");
      return;
    }

    // Optimistic update
    setIsFavorited((prev) => !prev);
    setIsTogglingFavorite(true);

    const result = await toggleFavoriteAction({ venueId: venue.id });
    setIsTogglingFavorite(false);

    if (result.error) {
      // Revert if error
      setIsFavorited((prev) => !prev);
      triggerToast("Error", result.error.message);
    } else {
      triggerToast(
        result.data.isFavorited ? "Saved to Favorites" : "Removed from Favorites",
        result.data.isFavorited
          ? "You can view this venue anytime in your account dashboard."
          : "This venue has been removed from your saved list."
      );
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    triggerToast("Link Copied", "The venue page link has been copied to your clipboard.");
  };

  const amenitiesList = venue.venue_amenities?.map((va: any) => va.amenities?.name).filter(Boolean) ?? [];

  return (
    <main className="container max-w-7xl mx-auto px-4 py-8 space-y-8 font-sans">
      {/* Top Header info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="bg-[var(--bg-subtle)] font-medium text-[var(--color-brand-600)] border-[var(--color-brand-500)]/20 uppercase tracking-wider text-[10px]">
              {venue.indoor_outdoor}
            </Badge>
            {venue.is_featured && (
              <Badge className="bg-amber-500 text-white font-semibold flex items-center gap-1 text-[10px]">
                <Flame className="h-3 w-3 fill-current" />
                Featured
              </Badge>
            )}
          </div>
          <h1 className="font-sora text-3xl md:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
            {venue.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--text-secondary)] font-medium">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-[var(--text-muted)]" />
              {venue.address}, {venue.city}, {venue.province}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-[var(--text-muted)]" />
              Up to {venue.capacity_max} guests
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleShare}
            variant="outline"
            className="rounded-xl border-[var(--border-default)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] font-semibold h-11 px-4 flex items-center gap-2 text-sm"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
          <Button
            onClick={handleFavoriteToggle}
            variant="outline"
            disabled={isTogglingFavorite}
            className={`rounded-xl border-[var(--border-default)] hover:bg-[var(--bg-subtle)] font-semibold h-11 px-4 flex items-center gap-2 text-sm transition-all ${
              isFavorited ? "text-red-500 border-red-200 bg-red-50/50" : "text-[var(--text-primary)]"
            }`}
          >
            <Heart className={`h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
            {isFavorited ? "Favorited" : "Favorite"}
          </Button>
        </div>
      </div>

      {/* Gallery Section */}
      <VenueGallery media={venue.venue_images} venueName={venue.name} />

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        {/* Left Columns - Details Info */}
        <div className="lg:col-span-2 space-y-10">
          {/* About Section */}
          <section className="space-y-4">
            <h3 className="font-sora text-xl font-bold tracking-tight text-[var(--text-primary)]">
              About the Venue
            </h3>
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed whitespace-pre-line">
              {venue.description || "No description provided for this venue."}
            </p>
            {venue.ai_generated_description && (
              <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-100/50 p-5 rounded-3xl space-y-2">
                <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 tracking-wider uppercase">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  AI Generated Overview
                </span>
                <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed">
                  "{venue.ai_generated_description}"
                </p>
              </div>
            )}
          </section>

          <Separator />

          {/* Amenities grid */}
          {amenitiesList.length > 0 && (
            <section className="space-y-4">
              <h3 className="font-sora text-xl font-bold tracking-tight text-[var(--text-primary)]">
                Amenities & Features
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {amenitiesList.map((amenity: string) => (
                  <div
                    key={amenity}
                    className="flex items-center gap-2 text-sm text-[var(--text-secondary)] bg-[var(--bg-subtle)] border border-[var(--border-default)] p-3.5 rounded-2xl font-medium"
                  >
                    <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <Separator />

          {/* Parking, Rules, and Policies */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
                <ParkingCircle className="h-4.5 w-4.5 text-[var(--color-brand-600)]" />
                Parking & Accessibility
              </span>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {venue.parking_available
                  ? "✅ Secure on-site private parking is available for all guests and coordinators."
                  : "❌ Private on-site parking is not available. Street parking or public pay lots are nearby."}
                {venue.wheelchair_accessible && " Accessible routes and ramps are fully prepared on-site."}
              </p>
            </div>

            <div className="space-y-3">
              <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
                <Clock className="h-4.5 w-4.5 text-[var(--color-brand-600)]" />
                Venue Rules
              </span>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {venue.venue_rules || "Standard booking policies apply. Respect operating hours, maximum guest capacity constraints, and municipal noise ordinances."}
              </p>
            </div>

            <div className="space-y-3 md:col-span-2">
              <span className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-[var(--text-primary)] uppercase">
                <FileText className="h-4.5 w-4.5 text-[var(--color-brand-600)]" />
                Cancellation Policy
              </span>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-subtle)] p-4 rounded-2xl border border-[var(--border-default)]">
                {venue.cancellation_policy || "Full refund is supported for cancellations requested at least 14 days before the event schedule date. Cancellations inside 14 days forfeit the initial deposit amount."}
              </p>
            </div>
          </section>

          <Separator />

          {/* Location / Map Section */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="font-sora text-xl font-bold tracking-tight text-[var(--text-primary)]">
                Location & Accessibility
              </h3>
              <span className="text-xs font-medium text-[var(--text-muted)]">
                📍 {venue.address}, {venue.city}
              </span>
            </div>
            {venue.latitude && venue.longitude ? (
              <VenueMap
                latitude={venue.latitude}
                longitude={venue.longitude}
                markerLabel={venue.name}
              />
            ) : (
              <div className="h-[300px] bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-3xl flex flex-col items-center justify-center text-center p-4">
                <Compass className="h-8 w-8 text-[var(--text-muted)] mb-2" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">Map details unavailable</p>
              </div>
            )}
          </section>

          <Separator />

          {/* Host/Organization Info */}
          <section className="bg-[var(--bg-subtle)] border border-[var(--border-default)] p-6 rounded-3xl flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-[var(--color-brand-600)] text-white font-sora font-extrabold flex items-center justify-center text-2xl shadow-md">
                {venue.organizations?.name?.slice(0, 2).toUpperCase() || "VE"}
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-[var(--color-brand-600)] tracking-wide uppercase">
                  Managed By
                </span>
                <h4 className="text-base font-bold text-[var(--text-primary)] font-sora">
                  {venue.organizations?.name || "Venora Host"}
                </h4>
                <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] font-medium">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  <span>Verified Organization Coordinator</span>
                </div>
              </div>
            </div>

            <div className="flex gap-4 items-center">
              <div className="text-left sm:text-right text-xs">
                <p className="text-[var(--text-muted)] font-medium">Response Rate</p>
                <p className="font-bold text-[var(--text-primary)] text-sm">98% / Fast Response</p>
              </div>
            </div>
          </section>

          <Separator />

          {/* Reviews Section */}
          <ReviewsSection
            reviews={reviews}
            avgRating={venue.avg_rating}
            reviewCount={venue.review_count}
          />
        </div>

        {/* Right Sticky Column - Booking Card Widget */}
        <div className="lg:col-span-1">
          <BookingSidebar
            venueId={venue.id}
            venueName={venue.name}
            basePrice={venue.base_price}
            priceUnit={venue.price_unit}
            capacityMin={venue.capacity_min ?? 1}
            capacityMax={venue.capacity_max}
            packages={venue.venue_packages ?? []}
          />
        </div>
      </div>

      {/* Nearby Venues Section */}
      {nearbyVenues.length > 0 && (
        <section className="space-y-6 pt-8 border-t border-[var(--border-default)]">
          <div className="space-y-1">
            <h3 className="font-sora text-xl font-bold tracking-tight text-[var(--text-primary)]">
              Explore Nearby Venues
            </h3>
            <p className="text-xs text-[var(--text-muted)] font-medium">
              Stunning event venues closest to this location.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {nearbyVenues.map((item) => {
              const coverImg = item.venue_images?.find((i: any) => i.is_featured) ?? item.venue_images?.[0];
              const imgUrl = coverImg ? `${supabaseUrl}/storage/v1/object/public/venue-images/${coverImg.storage_path}` : null;

              return (
                <Link
                  key={item.id}
                  href={`/venues/${item.slug}`}
                  className="group rounded-3xl border border-[var(--border-default)] bg-[var(--bg-base)] overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col h-full"
                >
                  <div className="h-48 w-full relative overflow-hidden bg-slate-100 flex-shrink-0">
                    {imgUrl ? (
                      <Image
                        src={imgUrl}
                        alt={item.name}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="h-full w-full bg-slate-100 flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-slate-300" />
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1">
                      <h4 className="font-sora font-bold text-base text-[var(--text-primary)] leading-snug line-clamp-1 group-hover:text-[var(--color-brand-600)] transition-colors">
                        {item.name}
                      </h4>
                      <p className="text-xs text-[var(--text-muted)] font-medium">
                        📍 {item.city}, {item.province}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-sm font-semibold">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-amber-400 stroke-amber-400" />
                        <span className="text-[var(--text-primary)]">{item.avg_rating.toFixed(1)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[var(--text-primary)]">₱{item.base_price?.toLocaleString()}</span>
                        <span className="text-xs font-normal text-[var(--text-muted)]">/day</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Global Toast component */}
      {toastOpen && (
        <Toast onOpenChange={setToastOpen}>
          <div className="flex flex-col gap-1">
            <ToastTitle>{toastMessage.title}</ToastTitle>
            <ToastDescription>{toastMessage.description}</ToastDescription>
          </div>
        </Toast>
      )}
    </main>
  );
}
