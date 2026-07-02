"use client";

import type { ReactNode } from "react";
import type { VenueProfileData } from "../types/venue.types";
import VenueFeaturedGallery from "./VenueFeaturedGallery";
import VenueProfileCard from "./VenueProfileCard";
import VenueCapacitySection from "./VenueCapacitySection";
import VenueDescriptionSection from "./VenueDescriptionSection";
import VenuePricingSection from "./VenuePricingSection";

interface VenueProfileFoundationProps {
  venue: VenueProfileData;
  isFavorited: boolean;
  isTogglingFavorite: boolean;
  onShare: () => void;
  onFavoriteToggle: () => void;
  bookingSidebar: ReactNode;
  mobileBookingBar?: ReactNode;
}

export default function VenueProfileFoundation({
  venue,
  isFavorited,
  isTogglingFavorite,
  onShare,
  onFavoriteToggle,
  bookingSidebar,
  mobileBookingBar,
}: VenueProfileFoundationProps) {
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Airbnb pattern: photos first, full-bleed on mobile */}
      <div className="-mx-4 md:mx-0">
        <VenueFeaturedGallery media={venue.venue_images} venueName={venue.name} />
      </div>

      <VenueProfileCard
        venue={venue}
        isFavorited={isFavorited}
        isTogglingFavorite={isTogglingFavorite}
        onShare={onShare}
        onFavoriteToggle={onFavoriteToggle}
      />

      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-0">
          <VenueCapacitySection venue={venue} />
          <VenueDescriptionSection
            description={venue.description}
            aiGeneratedDescription={venue.ai_generated_description}
          />
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24">{bookingSidebar}</div>
        </aside>
      </div>

      <div className="lg:hidden">
        <VenuePricingSection
          basePrice={venue.base_price}
          priceUnit={venue.price_unit}
          packages={venue.venue_packages}
          className="mb-6 border-b border-[var(--border-default)] pb-8"
        />
        {bookingSidebar}
      </div>

      {mobileBookingBar}
    </div>
  );
}
