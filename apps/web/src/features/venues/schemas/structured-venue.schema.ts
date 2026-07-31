import { z } from "zod";
import {
  PACKAGE_VENUE_SPACE_INCLUSION_TYPES,
  VENUE_FAQ_CATEGORIES,
  VENUE_MEDIA_COLLECTION_TYPES,
  VENUE_MEDIA_PROVIDER_VALUES,
  VENUE_SPACE_LAYOUTS,
  VENUE_SPACE_SETTINGS,
  VENUE_SPACE_TYPES,
  VENUE_STRUCTURED_CONTENT_STATUSES,
  VENUE_STRUCTURED_MEDIA_TYPES,
} from "../domain/structured-venue.types";

const MAX_CAPACITY = 100_000;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const rawHtmlPattern = /<[a-z][\s\S]*>/i;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
const storagePathPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[^<>\\]+$/i;

const uuidSchema = z.string().uuid();
const nonnegativeIntSchema = z.number().int().min(0);
const displayOrderSchema = nonnegativeIntSchema;

function plainText(max: number, min = 0) {
  const schema = z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine((value) => !rawHtmlPattern.test(value), {
      message: "Use plain text only.",
    });

  return schema;
}

function optionalPlainText(max: number) {
  return plainText(max).nullable().optional();
}

function uniqueValues(values: readonly string[]) {
  return new Set(values).size === values.length;
}

function duplicated(values: readonly string[]) {
  return new Set(values).size !== values.length;
}

function assertNoDuplicateIds(
  ids: readonly string[],
  ctx: z.RefinementCtx,
  path: Array<string | number>,
  message: string,
) {
  if (duplicated(ids)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path,
      message,
    });
  }
}

function parseStoragePath(value: string) {
  const parts = value.split("/");

  return {
    organizationId: parts[0],
    venueId: parts[1],
  };
}

function hasSafeHttpsUrl(value: string) {
  if (value.includes("<") || value.includes(">")) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !value.startsWith("//")
    );
  } catch {
    return false;
  }
}

const statusSchema = z.enum(VENUE_STRUCTURED_CONTENT_STATUSES);
const spaceSettingSchema = z.enum(VENUE_SPACE_SETTINGS);
const spaceTypeSchema = z.enum(VENUE_SPACE_TYPES);
const spaceLayoutSchema = z.enum(VENUE_SPACE_LAYOUTS);
const mediaCollectionTypeSchema = z.enum(VENUE_MEDIA_COLLECTION_TYPES);
const structuredMediaTypeSchema = z.enum(VENUE_STRUCTURED_MEDIA_TYPES);
const faqCategorySchema = z.enum(VENUE_FAQ_CATEGORIES);
const packageVenueSpaceInclusionTypeSchema = z.enum(
  PACKAGE_VENUE_SPACE_INCLUSION_TYPES,
);

const mediaProviderSchema = z.never();

const baseVenueRevisionScopeSchema = z
  .object({
    venueId: uuidSchema,
    revisionId: uuidSchema,
  })
  .strict();

export const createVenueSpaceSchema = baseVenueRevisionScopeSchema
  .extend({
    name: plainText(120, 2),
    slug: z
      .string()
      .trim()
      .min(2)
      .max(120)
      .regex(slugPattern, "Use lowercase kebab-case."),
    spaceType: spaceTypeSchema.nullable().optional(),
    setting: spaceSettingSchema,
    shortDescription: optionalPlainText(220),
    description: optionalPlainText(4000),
    capacityMin: z.number().int().min(0).max(MAX_CAPACITY).nullable().optional(),
    capacityMax: z.number().int().min(0).max(MAX_CAPACITY),
    accessibilitySummary: optionalPlainText(1000),
    restrictions: optionalPlainText(2000),
    operatingNotes: optionalPlainText(2000),
    displayOrder: displayOrderSchema.default(0),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.capacityMin !== null &&
      value.capacityMin !== undefined &&
      value.capacityMin > value.capacityMax
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["capacityMin"],
        message: "Minimum capacity must be less than or equal to maximum.",
      });
    }
  });

export type CreateVenueSpaceInput = z.infer<typeof createVenueSpaceSchema>;

export const updateVenueSpaceSchema = baseVenueRevisionScopeSchema
  .extend({
    spaceId: uuidSchema,
    name: plainText(120, 2).optional(),
    slug: z.string().trim().min(2).max(120).regex(slugPattern).optional(),
    spaceType: spaceTypeSchema.nullable().optional(),
    setting: spaceSettingSchema.optional(),
    shortDescription: optionalPlainText(220),
    description: optionalPlainText(4000),
    capacityMin: z.number().int().min(0).max(MAX_CAPACITY).nullable().optional(),
    capacityMax: z.number().int().min(0).max(MAX_CAPACITY).optional(),
    accessibilitySummary: optionalPlainText(1000),
    restrictions: optionalPlainText(2000),
    operatingNotes: optionalPlainText(2000),
    displayOrder: displayOrderSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.capacityMin !== null &&
      value.capacityMin !== undefined &&
      value.capacityMax !== undefined &&
      value.capacityMin > value.capacityMax
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["capacityMin"],
        message: "Minimum capacity must be less than or equal to maximum.",
      });
    }
  });

export type UpdateVenueSpaceInput = z.infer<typeof updateVenueSpaceSchema>;

export const reorderVenueSpacesSchema = baseVenueRevisionScopeSchema
  .extend({
    orderedIds: z.array(uuidSchema).min(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    assertNoDuplicateIds(value.orderedIds, ctx, ["orderedIds"], "Duplicate IDs.");
  });

export type ReorderVenueSpacesInput = z.infer<typeof reorderVenueSpacesSchema>;

export const archiveVenueSpaceSchema = baseVenueRevisionScopeSchema
  .extend({
    spaceId: uuidSchema,
  })
  .strict();

const capacityLayoutSchema = z
  .object({
    layout: spaceLayoutSchema,
    customLayoutLabel: plainText(120, 2).nullable().optional(),
    capacity: z.number().int().min(0).max(MAX_CAPACITY),
    notes: optionalPlainText(1000),
    displayOrder: displayOrderSchema.default(0),
  })
  .strict();

export const capacityLayoutsSchema = baseVenueRevisionScopeSchema
  .extend({
    spaceId: uuidSchema,
    spaceCapacityMax: z.number().int().min(0).max(MAX_CAPACITY),
    layouts: z.array(capacityLayoutSchema).min(1),
  })
  .strict()
  .superRefine((value, ctx) => {
    const keys = value.layouts.map(
      (layout) => `${layout.layout}:${layout.customLayoutLabel ?? ""}`,
    );
    assertNoDuplicateIds(keys, ctx, ["layouts"], "Duplicate layout rows.");

    value.layouts.forEach((layout, index) => {
      if (layout.layout === "custom" && !layout.customLayoutLabel) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["layouts", index, "customLayoutLabel"],
          message: "Custom layout label is required.",
        });
      }
      if (layout.layout !== "custom" && layout.customLayoutLabel) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["layouts", index, "customLayoutLabel"],
          message: "Custom labels are only allowed for custom layouts.",
        });
      }
      if (layout.capacity > value.spaceCapacityMax) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["layouts", index, "capacity"],
          message: "Layout capacity cannot exceed the space capacity.",
        });
      }
    });
  });

export type CapacityLayoutsInput = z.infer<typeof capacityLayoutsSchema>;

const spaceAmenitySchema = z
  .object({
    amenityId: uuidSchema,
    notes: optionalPlainText(500),
  })
  .strict();

export const spaceAmenitiesSchema = baseVenueRevisionScopeSchema
  .extend({
    spaceId: uuidSchema,
    amenities: z.array(spaceAmenitySchema),
  })
  .strict()
  .superRefine((value, ctx) => {
    assertNoDuplicateIds(
      value.amenities.map((item) => item.amenityId),
      ctx,
      ["amenities"],
      "Duplicate amenity relationships.",
    );
  });

export type SpaceAmenitiesInput = z.infer<typeof spaceAmenitiesSchema>;

const spaceEventTypeSchema = z
  .object({
    eventTypeId: uuidSchema,
    notes: optionalPlainText(500),
  })
  .strict();

export const spaceEventTypesSchema = baseVenueRevisionScopeSchema
  .extend({
    spaceId: uuidSchema,
    eventTypes: z.array(spaceEventTypeSchema),
  })
  .strict()
  .superRefine((value, ctx) => {
    assertNoDuplicateIds(
      value.eventTypes.map((item) => item.eventTypeId),
      ctx,
      ["eventTypes"],
      "Duplicate event type relationships.",
    );
  });

export type SpaceEventTypesInput = z.infer<typeof spaceEventTypesSchema>;

export const mediaCollectionSchema = baseVenueRevisionScopeSchema
  .extend({
    spaceId: uuidSchema.nullable().optional(),
    collectionType: mediaCollectionTypeSchema,
    title: optionalPlainText(120),
    description: optionalPlainText(500),
    displayOrder: displayOrderSchema.default(0),
    isCover: z.boolean().default(false),
  })
  .strict();

export type MediaCollectionInput = z.infer<typeof mediaCollectionSchema>;

export const mediaItemSchema = z
  .object({
    collectionId: uuidSchema,
    venueId: uuidSchema,
    spaceId: uuidSchema.nullable().optional(),
    storagePath: z.string().trim().regex(storagePathPattern).nullable().optional(),
    legacyVenueImageId: uuidSchema.nullable().optional(),
    mediaType: structuredMediaTypeSchema,
    externalUrl: z
      .string()
      .trim()
      .refine(hasSafeHttpsUrl, "External media must use a safe HTTPS URL.")
      .nullable()
      .optional(),
    externalProvider: mediaProviderSchema.nullable().optional(),
    altText: optionalPlainText(300),
    caption: optionalPlainText(500),
    transcript: optionalPlainText(10000),
    displayOrder: displayOrderSchema.default(0),
    isFeatured: z.boolean().default(false),
  })
  .strict()
  .superRefine((value, ctx) => {
    const hasStoragePath = Boolean(value.storagePath);
    const hasExternalUrl = Boolean(value.externalUrl);

    if (hasStoragePath === hasExternalUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["storagePath"],
        message: "Provide either a storage path or external URL.",
      });
    }

    if (value.storagePath) {
      const pathParts = parseStoragePath(value.storagePath);
      if (pathParts.venueId !== value.venueId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["storagePath"],
          message: "Storage path must belong to the venue.",
        });
      }
    }

    if (value.mediaType === "external_video") {
      if (VENUE_MEDIA_PROVIDER_VALUES.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["externalProvider"],
          message: "External video providers are not enabled.",
        });
      }
      if (!value.externalUrl) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["externalUrl"],
          message: "External video URL is required.",
        });
      }
    } else if (value.externalUrl || value.externalProvider) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["externalUrl"],
        message: "External media is only allowed for external videos.",
      });
    }

    if (value.mediaType !== "external_video" && !value.storagePath) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["storagePath"],
        message: "Uploaded media requires a storage path.",
      });
    }
  });

export type MediaItemInput = z.infer<typeof mediaItemSchema>;

export const venueLogisticsSchema = baseVenueRevisionScopeSchema
  .extend({
    parkingCapacity: z.number().int().min(0).nullable().optional(),
    parkingNotes: optionalPlainText(1000),
    accessibilityNotes: optionalPlainText(1500),
    arrivalNotes: optionalPlainText(1500),
    publicTransportationNotes: optionalPlainText(1500),
    weatherBackupAvailable: z.boolean().nullable().optional(),
    weatherBackupNotes: optionalPlainText(1500),
    curfewTime: z.string().trim().regex(timePattern).nullable().optional(),
    noiseRestrictions: optionalPlainText(1500),
    setupRules: optionalPlainText(2000),
    teardownRules: optionalPlainText(2000),
    externalSupplierRules: optionalPlainText(2000),
    petPolicy: optionalPlainText(1000),
    smokingPolicy: optionalPlainText(1000),
    otherNotes: optionalPlainText(2000),
  })
  .strict();

export type VenueLogisticsInput = z.infer<typeof venueLogisticsSchema>;

export const venueFaqSchema = baseVenueRevisionScopeSchema
  .extend({
    question: plainText(200, 5),
    answer: plainText(2000, 5),
    category: faqCategorySchema.nullable().optional(),
    displayOrder: displayOrderSchema.default(0),
  })
  .strict();

export type VenueFaqInput = z.infer<typeof venueFaqSchema>;

const packageVenueSpaceSchema = z
  .object({
    spaceId: uuidSchema,
    inclusionType: packageVenueSpaceInclusionTypeSchema,
    inclusionNotes: optionalPlainText(1000),
    displayOrder: displayOrderSchema.default(0),
  })
  .strict();

export const packageVenueSpacesSchema = z
  .object({
    venueId: uuidSchema,
    packageId: uuidSchema,
    spaces: z.array(packageVenueSpaceSchema),
  })
  .strict()
  .superRefine((value, ctx) => {
    assertNoDuplicateIds(
      value.spaces.map((item) => item.spaceId),
      ctx,
      ["spaces"],
      "Duplicate package-space relationships.",
    );
  });

export type PackageVenueSpacesInput = z.infer<
  typeof packageVenueSpacesSchema
>;

export const publishStructuredVenueProfileSchema =
  baseVenueRevisionScopeSchema.strict();

export type PublishStructuredVenueProfileInput = z.infer<
  typeof publishStructuredVenueProfileSchema
>;

export const archiveStructuredVenueRevisionSchema = baseVenueRevisionScopeSchema
  .extend({
    reason: optionalPlainText(500),
  })
  .strict();

export interface PackageVenueSpaceOwnershipInput {
  venueId: string;
  packageVenueId: string;
  spaceVenueId: string;
}

export function isPackageVenueSpaceOwnershipValid(
  input: PackageVenueSpaceOwnershipInput,
) {
  return (
    input.packageVenueId === input.venueId &&
    input.spaceVenueId === input.venueId
  );
}

export const structuredVenueControlledValueContract = {
  statusesAreUnique: uniqueValues(VENUE_STRUCTURED_CONTENT_STATUSES),
  externalProvidersEnabled: VENUE_MEDIA_PROVIDER_VALUES.length > 0,
};

export type StructuredVenueControlledValueContract =
  typeof structuredVenueControlledValueContract;
