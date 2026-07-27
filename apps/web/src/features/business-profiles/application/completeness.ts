import type { BusinessProfileDraft } from "../types/business-profile.types";

export type CompletenessResult = {
  percentage: number;
  missingItems: string[];
  isEligibleForPublish: boolean;
};

export function calculateProfileCompleteness(
  draft: BusinessProfileDraft,
): CompletenessResult {
  let percentage = 0;
  const missingItems: string[] = [];
  const missingPublishBlockers: string[] = [];

  // Display name: 10%
  if (draft.display_name && draft.display_name.trim().length > 0) {
    percentage += 10;
  } else {
    missingItems.push("Display name");
    missingPublishBlockers.push("Display name");
  }

  // Logo: 10%
  if (draft.logo_path) {
    percentage += 10;
  } else {
    missingItems.push("Business logo");
    missingPublishBlockers.push("Business logo");
  }

  // Cover image: 10%
  if (draft.cover_image_path) {
    percentage += 10;
  } else {
    missingItems.push("Cover image");
    missingPublishBlockers.push("Cover image");
  }

  // Tagline: 5%
  if (draft.tagline && draft.tagline.trim().length > 0) {
    percentage += 5;
  } else {
    missingItems.push("Tagline");
  }

  // Short description: 10%
  if (draft.short_description && draft.short_description.trim().length > 0) {
    percentage += 10;
  } else {
    missingItems.push("Short description");
    missingPublishBlockers.push("Short description");
  }

  // Full About section: 15%
  if (draft.about && draft.about.trim().length > 0) {
    percentage += 15;
  } else {
    missingItems.push("About section");
    missingPublishBlockers.push("About section");
  }

  // Primary location: 10% (requires city and province)
  if (draft.city && draft.province) {
    percentage += 10;
  } else {
    missingItems.push("Primary location (city and province)");
    missingPublishBlockers.push("Primary location");
  }

  // At least one visible published venue: 15%
  const hasConnectedVisibleVenue =
    draft.venues &&
    draft.venues.length > 0 &&
    draft.venues.some((v) => v.is_visible);
  const hasPublishedOwnedVenue =
    draft.published_venues && draft.published_venues.length > 0;
  const hasVisibleVenue = Boolean(
    hasConnectedVisibleVenue || hasPublishedOwnedVenue,
  );
  if (hasVisibleVenue) {
    percentage += 15;
  } else {
    missingItems.push("At least one connected, visible venue");
    missingPublishBlockers.push("At least one eligible venue");
  }

  // At least one visible portfolio item: 10%
  const hasPortfolioItem =
    draft.portfolio &&
    draft.portfolio.length > 0 &&
    draft.portfolio.some((p) => p.is_visible);
  if (hasPortfolioItem) {
    percentage += 10;
  } else {
    missingItems.push("Portfolio item");
  }

  // Public website, email, phone, or social link: 5%
  const hasContact = !!(
    draft.website_url ||
    (draft.public_email && draft.email_visibility) ||
    (draft.public_phone && draft.phone_visibility) ||
    (draft.social_links &&
      draft.social_links.length > 0 &&
      draft.social_links.some((s) => s.is_visible))
  );
  if (hasContact) {
    percentage += 5;
  } else {
    missingItems.push("At least one public contact method or social link");
  }

  // Slug check
  if (!draft.slug || draft.slug.trim().length === 0) {
    missingPublishBlockers.push("Valid URL slug");
  }

  const isEligibleForPublish = missingPublishBlockers.length === 0;

  return {
    percentage,
    missingItems: isEligibleForPublish ? missingItems : missingPublishBlockers,
    isEligibleForPublish,
  };
}
