import type { PublicOwnerProfile } from "@/src/features/owners/application/queries";
import {
  getVenueSpaceLayoutLabel,
  getVenueSpaceSettingLabel,
  type DraftStructuredVenueProfile,
  type PublishedStructuredVenueProfile,
  type VenueSpaceCapacityLayout,
} from "../domain/structured-venue.types";
import { getVenueMediaUrl } from "../utils/venue-media";
import { mergeAmenityNames } from "../utils/venue-mappers";

export type PublicVenueProfileMode = "public" | "preview";

export type PublicVenueMedia = {
  id: string;
  src: string;
  mediaType: "image" | "video";
  altText: string;
  caption: string | null;
  transcript: string | null;
  featured: boolean;
  spaceKey: string | null;
  collectionTitle: string | null;
};

export type PublicVenueSpace = {
  key: string;
  slug: string;
  name: string;
  setting: string;
  type: string | null;
  shortDescription: string | null;
  description: string | null;
  capacityMin: number | null;
  capacityMax: number;
  capacityLayouts: Array<{ label: string; capacity: number; notes: string | null }>;
  amenities: string[];
  eventTypes: string[];
  accessibility: string | null;
  restrictions: string | null;
  operatingNotes: string | null;
  media: PublicVenueMedia[];
};

export type PublicVenuePackage = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  priceUnit: string | null;
  minGuests: number | null;
  maxGuests: number | null;
  inclusions: string[];
  includedSpaces: Array<{
    key: string;
    name: string;
    inclusionType: string;
    notes: string | null;
  }>;
};

export type PublicVenueLogisticsItem = {
  key: string;
  label: string;
  value: string;
};

export type PublicVenueProfileViewModel = {
  mode: PublicVenueProfileMode;
  source: "legacy" | "structured";
  venue: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    shortDescription: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
    locationLabel: string | null;
    capacityMin: number | null;
    capacityMax: number | null;
    setting: string | null;
    basePrice: number | null;
    priceUnit: string | null;
    verified: boolean;
  };
  hero: {
    image: PublicVenueMedia | null;
    video: PublicVenueMedia | null;
  };
  gallery: PublicVenueMedia[];
  quickFacts: Array<{ key: string; label: string; value: string }>;
  spaces: PublicVenueSpace[];
  eventTypes: string[];
  packages: PublicVenuePackage[];
  amenities: string[];
  logistics: PublicVenueLogisticsItem[];
  faqs: Array<{ question: string; answer: string; category: string | null }>;
  rating: { average: number; count: number };
  owner: {
    slug: string;
    name: string;
    verified: boolean;
    venueCount: number;
    averageRating: number;
    reviewCount: number;
  } | null;
  actions: {
    venueHref: string;
    bookingHref: string;
    eventPlanHref: "/plan-event";
  };
  sections: string[];
};

export type PublicVenueSpaceRelations = {
  capacityLayouts: VenueSpaceCapacityLayout[];
  amenities: Array<{ spaceId: string; name: string }>;
  eventTypes: Array<{ spaceId: string; name: string }>;
};

type StructuredProfile =
  | PublishedStructuredVenueProfile
  | DraftStructuredVenueProfile;

export type BuildPublicVenueProfileInput = {
  mode?: PublicVenueProfileMode;
  venue: any;
  structuredProfile?: StructuredProfile | null;
  spaceRelations?: PublicVenueSpaceRelations;
  reviews?: any[];
  ownerProfile?: PublicOwnerProfile | null;
};

function cleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned ? cleaned : null;
}

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function titleCase(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function uniqueStrings(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  return values.filter((value): value is string => {
    const cleaned = cleanString(value);
    if (!cleaned) return false;
    const key = cleaned.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isVisibleStructuredStatus(
  status: string,
  mode: PublicVenueProfileMode,
) {
  return mode === "preview" ? status !== "archived" : status === "published";
}

function mapLegacyMedia(venue: any): PublicVenueMedia[] {
  return [...(venue.venue_images ?? [])]
    .filter((item) => item?.storage_path && item?.media_type !== "document")
    .sort(
      (a, b) =>
        Number(a.display_order ?? 0) - Number(b.display_order ?? 0),
    )
    .map((item, index) => ({
      id: String(item.id ?? `legacy-media-${index}`),
      src: getVenueMediaUrl(String(item.storage_path)),
      mediaType: item.media_type === "video" ? "video" : "image",
      altText:
        cleanString(item.alt_text) ??
        `${String(venue.name ?? "Venue")} ${item.media_type === "video" ? "video" : "photo"}`,
      caption: cleanString(item.caption),
      transcript: cleanString(item.transcript),
      featured: Boolean(item.is_featured),
      spaceKey: null,
      collectionTitle: null,
    }));
}

function mapStructuredMedia(
  profile: StructuredProfile,
  mode: PublicVenueProfileMode,
  venueName: string,
) {
  const spacesById = new Map(profile.spaces.map((space) => [space.id, space]));
  const collectionsById = new Map(
    profile.mediaCollections
      .filter((collection) => isVisibleStructuredStatus(collection.status, mode))
      .map((collection) => [collection.id, collection]),
  );

  return profile.mediaItems
    .filter(
      (item) =>
        isVisibleStructuredStatus(item.status, mode) &&
        !item.deletedAt &&
        Boolean(item.storagePath) &&
        item.mediaType !== "external_video" &&
        collectionsById.has(item.collectionId),
    )
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((item): PublicVenueMedia => {
      const collection = collectionsById.get(item.collectionId)!;
      const space = item.spaceId ? spacesById.get(item.spaceId) : null;
      return {
        id: item.id,
        src: getVenueMediaUrl(item.storagePath!),
        mediaType: item.mediaType === "video" ? "video" : "image",
        altText:
          cleanString(item.altText) ??
          `${space?.name ?? venueName} ${item.mediaType === "video" ? "video" : "photo"}`,
        caption: cleanString(item.caption),
        transcript: cleanString(item.transcript),
        featured: item.isFeatured || collection.isCover,
        spaceKey: space?.slug ?? null,
        collectionTitle: cleanString(collection.title),
      };
    });
}

function calculateRating(venue: any, reviews: any[]) {
  const publishedRatings = reviews
    .map((review) => finiteNumber(review?.overall_rating))
    .filter((rating): rating is number => rating !== null && rating > 0);
  const storedCount = Math.max(0, finiteNumber(venue.review_count) ?? 0);
  const count = Math.max(storedCount, publishedRatings.length);
  const storedAverage = finiteNumber(venue.avg_rating) ?? 0;
  const loadedAverage = publishedRatings.length
    ? publishedRatings.reduce((sum, rating) => sum + rating, 0) /
      publishedRatings.length
    : 0;
  return {
    average: count > 0 ? (storedAverage > 0 ? storedAverage : loadedAverage) : 0,
    count,
  };
}

function buildLogistics(
  venue: any,
  structured: StructuredProfile | null,
): PublicVenueLogisticsItem[] {
  const logistics = structured?.logistics;
  const values: Array<PublicVenueLogisticsItem | null> = [
    logistics?.parkingCapacity
      ? {
          key: "parking-capacity",
          label: "Parking capacity",
          value: `${logistics.parkingCapacity.toLocaleString("en-PH")} vehicles`,
        }
      : null,
    cleanString(logistics?.parkingNotes)
      ? { key: "parking", label: "Parking", value: logistics!.parkingNotes! }
      : venue.parking_available
        ? { key: "parking", label: "Parking", value: "On-site parking available" }
        : null,
    cleanString(logistics?.accessibilityNotes)
      ? {
          key: "accessibility",
          label: "Accessibility",
          value: logistics!.accessibilityNotes!,
        }
      : venue.wheelchair_accessible
        ? {
            key: "accessibility",
            label: "Accessibility",
            value: "Wheelchair-accessible facilities are available",
          }
        : null,
    cleanString(logistics?.arrivalNotes)
      ? { key: "arrival", label: "Arrival", value: logistics!.arrivalNotes! }
      : null,
    cleanString(logistics?.publicTransportationNotes)
      ? {
          key: "transport",
          label: "Public transportation",
          value: logistics!.publicTransportationNotes!,
        }
      : null,
    logistics?.weatherBackupAvailable || cleanString(logistics?.weatherBackupNotes)
      ? {
          key: "weather-backup",
          label: "Weather backup",
          value: cleanString(logistics?.weatherBackupNotes) ?? "Backup option available",
        }
      : null,
    cleanString(logistics?.curfewTime)
      ? { key: "curfew", label: "Curfew", value: logistics!.curfewTime! }
      : null,
    cleanString(logistics?.noiseRestrictions)
      ? {
          key: "noise",
          label: "Noise restrictions",
          value: logistics!.noiseRestrictions!,
        }
      : null,
    cleanString(logistics?.setupRules)
      ? { key: "setup", label: "Setup", value: logistics!.setupRules! }
      : null,
    cleanString(logistics?.teardownRules)
      ? { key: "teardown", label: "Teardown", value: logistics!.teardownRules! }
      : null,
    cleanString(logistics?.externalSupplierRules)
      ? {
          key: "suppliers",
          label: "External suppliers",
          value: logistics!.externalSupplierRules!,
        }
      : null,
    cleanString(logistics?.petPolicy)
      ? { key: "pets", label: "Pet policy", value: logistics!.petPolicy! }
      : venue.pet_friendly
        ? { key: "pets", label: "Pet policy", value: "Pet-friendly arrangements available" }
        : null,
    cleanString(logistics?.smokingPolicy)
      ? { key: "smoking", label: "Smoking policy", value: logistics!.smokingPolicy! }
      : null,
    cleanString(logistics?.otherNotes)
      ? { key: "other", label: "Other notes", value: logistics!.otherNotes! }
      : null,
  ];
  return values.filter((item): item is PublicVenueLogisticsItem => Boolean(item));
}

export function buildPublicVenueProfile(
  input: BuildPublicVenueProfileInput,
): PublicVenueProfileViewModel {
  const mode = input.mode ?? "public";
  const venue = input.venue;
  const profile = input.structuredProfile ?? null;
  const visibleSpaces = (profile?.spaces ?? []).filter((space) =>
    isVisibleStructuredStatus(space.status, mode),
  );
  const relations = input.spaceRelations ?? {
    capacityLayouts: [],
    amenities: [],
    eventTypes: [],
  };
  const legacyMedia = mapLegacyMedia(venue);
  const structuredMedia = profile
    ? mapStructuredMedia(profile, mode, String(venue.name))
    : [];
  const media = structuredMedia.length > 0 ? structuredMedia : legacyMedia;
  const gallery = media.filter((item) => item.mediaType === "image");
  const heroImage =
    gallery.find((item) => item.featured) ?? gallery[0] ?? null;
  const heroVideo =
    media.find((item) => item.mediaType === "video" && item.featured) ??
    media.find((item) => item.mediaType === "video") ??
    null;

  const spaces: PublicVenueSpace[] = visibleSpaces.map((space) => {
    const capacityLayouts = relations.capacityLayouts
      .filter((layout) => layout.spaceId === space.id)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((layout) => ({
        label:
          layout.layout === "custom" && layout.customLayoutLabel
            ? layout.customLayoutLabel
            : getVenueSpaceLayoutLabel(layout.layout),
        capacity: layout.capacity,
        notes: cleanString(layout.notes),
      }));
    return {
      key: space.slug,
      slug: space.slug,
      name: space.name,
      setting: getVenueSpaceSettingLabel(space.setting),
      type: space.spaceType ? titleCase(space.spaceType) : null,
      shortDescription: cleanString(space.shortDescription),
      description: cleanString(space.description),
      capacityMin: finiteNumber(space.capacityMin),
      capacityMax: space.capacityMax,
      capacityLayouts,
      amenities: uniqueStrings(
        relations.amenities
          .filter((amenity) => amenity.spaceId === space.id)
          .map((amenity) => amenity.name),
      ),
      eventTypes: uniqueStrings(
        relations.eventTypes
          .filter((eventType) => eventType.spaceId === space.id)
          .map((eventType) => eventType.name),
      ),
      accessibility: cleanString(space.accessibilitySummary),
      restrictions: cleanString(space.restrictions),
      operatingNotes: cleanString(space.operatingNotes),
      media: media.filter((item) => item.spaceKey === space.slug),
    };
  });

  const legacyAmenities = mergeAmenityNames(
    venue.venue_amenities
      ?.map((item: any) => item.amenities?.name)
      .filter(Boolean) ?? [],
    venue.custom_amenities,
  );
  const amenities = uniqueStrings([
    ...legacyAmenities,
    ...spaces.flatMap((space) => space.amenities),
  ]);
  const eventTypes = uniqueStrings([
    ...(venue.event_types ?? []).map((item: any) =>
      typeof item === "string" ? item : item?.name ?? item?.event_types?.name,
    ),
    ...spaces.flatMap((space) => space.eventTypes),
  ]);
  const packages: PublicVenuePackage[] = (venue.venue_packages ?? [])
    .filter((pkg: any) => pkg.is_active !== false)
    .map((pkg: any) => ({
      id: String(pkg.id),
      name: String(pkg.name),
      description: cleanString(pkg.description),
      price: finiteNumber(pkg.price),
      priceUnit: cleanString(pkg.price_unit),
      minGuests: finiteNumber(pkg.min_guests),
      maxGuests: finiteNumber(pkg.max_guests),
      inclusions: uniqueStrings(pkg.inclusions ?? []),
      includedSpaces: (profile?.packageSpaces ?? [])
        .filter((link) => link.packageId === pkg.id)
        .map((link) => {
          const space = visibleSpaces.find((item) => item.id === link.spaceId);
          return space
            ? {
                key: space.slug,
                name: space.name,
                inclusionType: link.inclusionType,
                notes: cleanString(link.inclusionNotes),
              }
            : null;
        })
        .filter(
          (space): space is NonNullable<typeof space> => Boolean(space),
        ),
    }));
  const logistics = buildLogistics(venue, profile);
  const rating = calculateRating(venue, input.reviews ?? []);
  const capacityMin = finiteNumber(venue.capacity_min);
  const capacityMax = finiteNumber(venue.capacity_max);
  const locationLabel = cleanString(
    [venue.city, venue.province].filter(Boolean).join(", "),
  );
  const setting = cleanString(venue.indoor_outdoor);
  const basePrice = finiteNumber(venue.base_price);
  const ownerProfile = input.ownerProfile ?? null;
  const slug = String(venue.slug ?? venue.id);

  const quickFacts = [
    capacityMax
      ? {
          key: "capacity",
          label: "Guest capacity",
          value: capacityMin
            ? `${capacityMin.toLocaleString("en-PH")}-${capacityMax.toLocaleString("en-PH")} guests`
            : `Up to ${capacityMax.toLocaleString("en-PH")} guests`,
        }
      : null,
    setting
      ? { key: "setting", label: "Setting", value: titleCase(setting) }
      : null,
    eventTypes.length > 0
      ? {
          key: "event-types",
          label: "Events",
          value: eventTypes.slice(0, 3).join(", "),
        }
      : null,
    basePrice
      ? {
          key: "price",
          label: "Starting price",
          value: new Intl.NumberFormat("en-PH", {
            style: "currency",
            currency: "PHP",
            maximumFractionDigits: 0,
          }).format(basePrice),
        }
      : null,
  ].filter(
    (fact): fact is { key: string; label: string; value: string } =>
      Boolean(fact),
  );

  const sections = [
    "overview",
    spaces.length ? "spaces" : null,
    eventTypes.length ? "experiences" : null,
    gallery.length > 1 || heroVideo ? "gallery" : null,
    packages.length ? "packages" : null,
    logistics.length ? "practical" : null,
    profile?.faqs?.length ? "faqs" : null,
    "reviews",
  ].filter((section): section is string => Boolean(section));

  return {
    mode,
    source: profile ? "structured" : "legacy",
    venue: {
      id: String(venue.id),
      slug,
      name: String(venue.name),
      description: cleanString(venue.description),
      shortDescription:
        cleanString(venue.short_description) ?? cleanString(venue.description),
      address: cleanString(venue.address),
      city: cleanString(venue.city),
      province: cleanString(venue.province),
      locationLabel,
      capacityMin,
      capacityMax,
      setting,
      basePrice,
      priceUnit: cleanString(venue.price_unit),
      verified: Boolean(venue.is_verified || ownerProfile?.isVerified),
    },
    hero: { image: heroImage, video: heroVideo },
    gallery,
    quickFacts,
    spaces,
    eventTypes,
    packages,
    amenities,
    logistics,
    faqs: (profile?.faqs ?? [])
      .filter((faq) => isVisibleStructuredStatus(faq.status, mode))
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((faq) => ({
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
      })),
    rating,
    owner: ownerProfile
      ? {
          slug: ownerProfile.slug,
          name: ownerProfile.name,
          verified: ownerProfile.isVerified,
          venueCount: ownerProfile.venueCount,
          averageRating: ownerProfile.avgRating,
          reviewCount: ownerProfile.reviewCount,
        }
      : null,
    actions: {
      venueHref: `/venues/${slug}`,
      bookingHref: `/venues/${slug}/book`,
      eventPlanHref: "/plan-event",
    },
    sections,
  };
}
