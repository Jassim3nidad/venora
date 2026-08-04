export const VENUE_STRUCTURED_CONTENT_STATUSES = [
  "draft",
  "published",
  "archived",
] as const;

export const VENUE_SPACE_SETTINGS = ["indoor", "outdoor", "mixed"] as const;

export const VENUE_SPACE_TYPES = [
  "ballroom",
  "garden",
  "pavilion",
  "ceremony_area",
  "reception_area",
  "preparation_suite",
  "custom",
] as const;

export const VENUE_SPACE_LAYOUTS = [
  "banquet",
  "theatre",
  "classroom",
  "cocktail",
  "u_shape",
  "boardroom",
  "standing",
  "ceremony",
  "custom",
] as const;

export const VENUE_MEDIA_COLLECTION_TYPES = [
  "hero",
  "gallery",
  "space_gallery",
  "video",
  "logistics",
] as const;

export const VENUE_STRUCTURED_MEDIA_TYPES = [
  "image",
  "video",
  "external_video",
] as const;

// Current Venora venue media supports uploaded MP4/MOV only. External-provider
// contracts remain closed until a reviewed allowlist is approved.
export const VENUE_MEDIA_PROVIDER_VALUES = [] as const;

export const VENUE_FAQ_CATEGORIES = [
  "pricing",
  "booking",
  "logistics",
  "suppliers",
  "accessibility",
  "policies",
  "other",
] as const;

export const PACKAGE_VENUE_SPACE_INCLUSION_TYPES = [
  "included",
  "optional",
  "upgrade",
] as const;

export type VenueStructuredContentStatus =
  (typeof VENUE_STRUCTURED_CONTENT_STATUSES)[number];
export type VenueProfileRevisionStatus = VenueStructuredContentStatus;
export type VenueSpaceSetting = (typeof VENUE_SPACE_SETTINGS)[number];
export type VenueSpaceType = (typeof VENUE_SPACE_TYPES)[number];
export type VenueSpaceLayout = (typeof VENUE_SPACE_LAYOUTS)[number];
export type VenueMediaCollectionType =
  (typeof VENUE_MEDIA_COLLECTION_TYPES)[number];
export type VenueStructuredMediaType =
  (typeof VENUE_STRUCTURED_MEDIA_TYPES)[number];
export type VenueMediaProvider = (typeof VENUE_MEDIA_PROVIDER_VALUES)[number];
export type VenueFaqCategory = (typeof VENUE_FAQ_CATEGORIES)[number];
export type PackageVenueSpaceInclusionType =
  (typeof PACKAGE_VENUE_SPACE_INCLUSION_TYPES)[number];

export const VENUE_SPACE_SETTING_LABELS: Record<VenueSpaceSetting, string> = {
  indoor: "Indoor",
  outdoor: "Outdoor",
  mixed: "Indoor and outdoor",
};

export const VENUE_SPACE_TYPE_LABELS: Record<VenueSpaceType, string> = {
  ballroom: "Ballroom",
  garden: "Garden",
  pavilion: "Pavilion",
  ceremony_area: "Ceremony area",
  reception_area: "Reception area",
  preparation_suite: "Preparation suite",
  custom: "Custom",
};

export const VENUE_SPACE_LAYOUT_LABELS: Record<VenueSpaceLayout, string> = {
  banquet: "Banquet",
  theatre: "Theatre",
  classroom: "Classroom",
  cocktail: "Cocktail",
  u_shape: "U-shape",
  boardroom: "Boardroom",
  standing: "Standing",
  ceremony: "Ceremony",
  custom: "Custom",
};

export const VENUE_MEDIA_COLLECTION_TYPE_LABELS: Record<
  VenueMediaCollectionType,
  string
> = {
  hero: "Hero",
  gallery: "Gallery",
  space_gallery: "Space gallery",
  video: "Video",
  logistics: "Logistics",
};

export const VENUE_FAQ_CATEGORY_LABELS: Record<VenueFaqCategory, string> = {
  pricing: "Pricing",
  booking: "Booking",
  logistics: "Logistics",
  suppliers: "Suppliers",
  accessibility: "Accessibility",
  policies: "Policies",
  other: "Other",
};

export const PACKAGE_VENUE_SPACE_INCLUSION_TYPE_LABELS: Record<
  PackageVenueSpaceInclusionType,
  string
> = {
  included: "Included",
  optional: "Optional",
  upgrade: "Upgrade",
};

type ValueList = readonly string[];

function includesValue<TValues extends ValueList>(
  values: TValues,
  value: unknown,
): value is TValues[number] {
  return typeof value === "string" && values.includes(value);
}

export function isVenueStructuredContentStatus(
  value: unknown,
): value is VenueStructuredContentStatus {
  return includesValue(VENUE_STRUCTURED_CONTENT_STATUSES, value);
}

export const isVenueProfileRevisionStatus = isVenueStructuredContentStatus;

export function isVenueSpaceSetting(value: unknown): value is VenueSpaceSetting {
  return includesValue(VENUE_SPACE_SETTINGS, value);
}

export function isVenueSpaceType(value: unknown): value is VenueSpaceType {
  return includesValue(VENUE_SPACE_TYPES, value);
}

export function isVenueSpaceLayout(value: unknown): value is VenueSpaceLayout {
  return includesValue(VENUE_SPACE_LAYOUTS, value);
}

export function isVenueMediaCollectionType(
  value: unknown,
): value is VenueMediaCollectionType {
  return includesValue(VENUE_MEDIA_COLLECTION_TYPES, value);
}

export function isVenueStructuredMediaType(
  value: unknown,
): value is VenueStructuredMediaType {
  return includesValue(VENUE_STRUCTURED_MEDIA_TYPES, value);
}

export function isVenueMediaProvider(
  value: unknown,
): value is VenueMediaProvider {
  return includesValue(VENUE_MEDIA_PROVIDER_VALUES, value);
}

export function isVenueFaqCategory(value: unknown): value is VenueFaqCategory {
  return includesValue(VENUE_FAQ_CATEGORIES, value);
}

export function isPackageVenueSpaceInclusionType(
  value: unknown,
): value is PackageVenueSpaceInclusionType {
  return includesValue(PACKAGE_VENUE_SPACE_INCLUSION_TYPES, value);
}

export function getVenueSpaceSettingLabel(value: VenueSpaceSetting): string {
  return VENUE_SPACE_SETTING_LABELS[value];
}

export function getVenueSpaceTypeLabel(value: VenueSpaceType): string {
  return VENUE_SPACE_TYPE_LABELS[value];
}

export function getVenueSpaceLayoutLabel(value: VenueSpaceLayout): string {
  return VENUE_SPACE_LAYOUT_LABELS[value];
}

export function getVenueMediaCollectionTypeLabel(
  value: VenueMediaCollectionType,
): string {
  return VENUE_MEDIA_COLLECTION_TYPE_LABELS[value];
}

export function getVenueFaqCategoryLabel(value: VenueFaqCategory): string {
  return VENUE_FAQ_CATEGORY_LABELS[value];
}

export function getPackageVenueSpaceInclusionTypeLabel(
  value: PackageVenueSpaceInclusionType,
): string {
  return PACKAGE_VENUE_SPACE_INCLUSION_TYPE_LABELS[value];
}

export type UuidString = string;
export type IsoTimestampString = string;
export type TimeString = string;

export interface VenueProfileRevision {
  id: UuidString;
  venueId: UuidString;
  status: VenueProfileRevisionStatus;
  revisionNumber: number;
  createdFromRevisionId: UuidString | null;
  publishedAt: IsoTimestampString | null;
  publishedBy: UuidString | null;
  archivedAt: IsoTimestampString | null;
  createdAt: IsoTimestampString;
  updatedAt: IsoTimestampString;
}

export interface VenueSpace {
  id: UuidString;
  revisionId: UuidString;
  venueId: UuidString;
  spaceKey: UuidString;
  name: string;
  slug: string;
  spaceType: VenueSpaceType | null;
  setting: VenueSpaceSetting;
  shortDescription: string | null;
  description: string | null;
  capacityMin: number | null;
  capacityMax: number;
  accessibilitySummary: string | null;
  restrictions: string | null;
  operatingNotes: string | null;
  displayOrder: number;
  status: VenueStructuredContentStatus;
  createdAt: IsoTimestampString;
  updatedAt: IsoTimestampString;
  archivedAt: IsoTimestampString | null;
}

export interface VenueSpaceCapacityLayout {
  id: UuidString;
  spaceId: UuidString;
  layout: VenueSpaceLayout;
  customLayoutLabel: string | null;
  capacity: number;
  notes: string | null;
  displayOrder: number;
  createdAt: IsoTimestampString;
  updatedAt: IsoTimestampString;
}

export interface VenueSpaceAmenity {
  spaceId: UuidString;
  amenityId: UuidString;
  notes: string | null;
  createdAt: IsoTimestampString;
}

export interface VenueSpaceEventType {
  spaceId: UuidString;
  eventTypeId: UuidString;
  notes: string | null;
  createdAt: IsoTimestampString;
}

export interface VenueMediaCollection {
  id: UuidString;
  revisionId: UuidString;
  venueId: UuidString;
  spaceId: UuidString | null;
  collectionType: VenueMediaCollectionType;
  title: string | null;
  description: string | null;
  displayOrder: number;
  isCover: boolean;
  status: VenueStructuredContentStatus;
  createdAt: IsoTimestampString;
  updatedAt: IsoTimestampString;
}

export interface VenueMediaItem {
  id: UuidString;
  collectionId: UuidString;
  venueId: UuidString;
  spaceId: UuidString | null;
  storagePath: string | null;
  legacyVenueImageId: UuidString | null;
  mediaType: VenueStructuredMediaType;
  externalUrl: string | null;
  externalProvider: VenueMediaProvider | null;
  altText: string | null;
  caption: string | null;
  transcript: string | null;
  displayOrder: number;
  isFeatured: boolean;
  status: VenueStructuredContentStatus;
  createdAt: IsoTimestampString;
  updatedAt: IsoTimestampString;
  deletedAt: IsoTimestampString | null;
}

export interface VenueLogistics {
  id: UuidString;
  revisionId: UuidString;
  venueId: UuidString;
  parkingCapacity: number | null;
  parkingNotes: string | null;
  accessibilityNotes: string | null;
  arrivalNotes: string | null;
  publicTransportationNotes: string | null;
  weatherBackupAvailable: boolean | null;
  weatherBackupNotes: string | null;
  curfewTime: TimeString | null;
  noiseRestrictions: string | null;
  setupRules: string | null;
  teardownRules: string | null;
  externalSupplierRules: string | null;
  petPolicy: string | null;
  smokingPolicy: string | null;
  otherNotes: string | null;
  status: VenueStructuredContentStatus;
  createdAt: IsoTimestampString;
  updatedAt: IsoTimestampString;
}

export interface VenueFaq {
  id: UuidString;
  revisionId: UuidString;
  venueId: UuidString;
  question: string;
  answer: string;
  category: VenueFaqCategory | null;
  displayOrder: number;
  status: VenueStructuredContentStatus;
  createdAt: IsoTimestampString;
  updatedAt: IsoTimestampString;
}

export interface PackageVenueSpace {
  id: UuidString;
  packageId: UuidString;
  spaceId: UuidString;
  venueId: UuidString;
  inclusionType: PackageVenueSpaceInclusionType;
  inclusionNotes: string | null;
  displayOrder: number;
  createdAt: IsoTimestampString;
  updatedAt: IsoTimestampString;
}

export type DraftVenueSpaceInput = Omit<
  VenueSpace,
  | "id"
  | "spaceKey"
  | "status"
  | "createdAt"
  | "updatedAt"
  | "archivedAt"
>;

export type DraftVenueMediaCollectionInput = Omit<
  VenueMediaCollection,
  "id" | "status" | "createdAt" | "updatedAt"
>;

export type DraftVenueMediaItemInput = Omit<
  VenueMediaItem,
  "id" | "status" | "createdAt" | "updatedAt" | "deletedAt"
>;

export type DraftVenueLogisticsInput = Omit<
  VenueLogistics,
  "id" | "status" | "createdAt" | "updatedAt"
>;

export type DraftVenueFaqInput = Omit<
  VenueFaq,
  "id" | "status" | "createdAt" | "updatedAt"
>;

export interface ReorderStructuredVenueItemsInput {
  venueId: UuidString;
  revisionId: UuidString;
  orderedIds: UuidString[];
}

export interface PublishStructuredVenueProfileInput {
  venueId: UuidString;
  revisionId: UuidString;
}

export interface ArchiveStructuredVenueItemInput {
  venueId: UuidString;
  revisionId: UuidString;
  id: UuidString;
}

export interface DraftStructuredVenueProfile {
  revision: VenueProfileRevision & { status: "draft" };
  spaces: VenueSpace[];
  mediaCollections: VenueMediaCollection[];
  mediaItems: VenueMediaItem[];
  logistics: VenueLogistics | null;
  faqs: VenueFaq[];
  packageSpaces: PackageVenueSpace[];
}

export interface PublishedStructuredVenueProfile {
  revision: VenueProfileRevision & { status: "published" };
  spaces: Array<VenueSpace & { status: "published" }>;
  mediaCollections: Array<VenueMediaCollection & { status: "published" }>;
  mediaItems: Array<VenueMediaItem & { status: "published" }>;
  logistics: (VenueLogistics & { status: "published" }) | null;
  faqs: Array<VenueFaq & { status: "published" }>;
  packageSpaces: PackageVenueSpace[];
}
