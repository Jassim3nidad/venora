import { z } from "zod";

const priceUnitSchema = z.enum(["per_event", "per_hour", "per_pax", "per_day"]);

const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalText = (max = 1000) =>
  z.preprocess(
    emptyToUndefined,
    z.string().trim().max(max).optional(),
  );

const optionalUrl = z.preprocess(
  emptyToUndefined,
  z.string().trim().url("Enter a valid URL").optional(),
);

const optionalEmail = z.preprocess(
  emptyToUndefined,
  z.string().trim().email("Enter a valid email").optional(),
);

const optionalPhone = z.preprocess(
  emptyToUndefined,
  z.string().trim().min(7, "Enter a valid phone number").max(32).optional(),
);

const optionalNumber = z.preprocess((value) => {
  if (value === "" || value === null || typeof value === "undefined") {
    return undefined;
  }
  return Number(value);
}, z.number().optional());

export const supplierSearchSchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  location: z.string().trim().max(120).optional(),
  minPrice: optionalNumber,
  maxPrice: optionalNumber,
  minRating: optionalNumber,
  accreditedOnly: z.coerce.boolean().default(true),
  sort: z
    .enum(["recommended", "rating", "price", "newest"])
    .default("recommended"),
});

export const supplierProfileSchema = z.object({
  businessName: z.string().trim().min(2, "Business name is required").max(120),
  categoryId: z.string().uuid("Choose a valid category").optional(),
  headline: optionalText(160),
  description: optionalText(1800),
  basePrice: optionalNumber.refine(
    (value) => typeof value === "undefined" || value >= 0,
    "Base price must be zero or higher",
  ),
  priceUnit: priceUnitSchema.default("per_event"),
  serviceAreas: z
    .array(z.string().trim().min(2).max(80))
    .min(1, "Add at least one service area")
    .max(12, "Use up to 12 service areas"),
  coverageRadiusKm: optionalNumber.refine(
    (value) => typeof value === "undefined" || value >= 0,
    "Coverage radius must be zero or higher",
  ),
  contactEmail: optionalEmail,
  contactPhone: optionalPhone,
  websiteUrl: optionalUrl,
  instagramUrl: optionalUrl,
  profileImageUrl: optionalUrl,
  heroImageUrl: optionalUrl,
  responseTimeHours: z.coerce.number().int().min(0).max(168).default(24),
  yearsInBusiness: optionalNumber.refine(
    (value) => typeof value === "undefined" || value >= 0,
    "Years in business must be zero or higher",
  ),
  teamSize: optionalNumber.refine(
    (value) => typeof value === "undefined" || value > 0,
    "Team size must be greater than zero",
  ),
  minimumBookingNoticeDays: z.coerce.number().int().min(0).max(365).default(14),
});

export const supplierPackageSchema = z
  .object({
    id: z.string().uuid().optional(),
    supplierId: z.string().uuid().optional(),
    name: z.string().trim().min(2, "Package name is required").max(120),
    description: optionalText(900),
    price: optionalNumber.refine(
      (value) => typeof value === "undefined" || value >= 0,
      "Price must be zero or higher",
    ),
    priceUnit: priceUnitSchema.default("per_event"),
    packageType: z.string().trim().min(2).max(60).default("standard"),
    inclusions: z.array(z.string().trim().min(2).max(120)).max(16).default([]),
    minGuests: optionalNumber.refine(
      (value) => typeof value === "undefined" || value > 0,
      "Minimum guests must be greater than zero",
    ),
    maxGuests: optionalNumber.refine(
      (value) => typeof value === "undefined" || value > 0,
      "Maximum guests must be greater than zero",
    ),
    isActive: z.coerce.boolean().default(true),
    sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  })
  .refine(
    (input) =>
      !input.minGuests ||
      !input.maxGuests ||
      input.maxGuests >= input.minGuests,
    {
      message: "Maximum guests must be greater than or equal to minimum guests",
      path: ["maxGuests"],
    },
  );

export const archiveSupplierPackageSchema = z.object({
  id: z.string().uuid("Package ID is required"),
});

export const supplierPortfolioSchema = z.object({
  id: z.string().uuid().optional(),
  supplierId: z.string().uuid().optional(),
  title: z.string().trim().min(2, "Title is required").max(120),
  description: optionalText(600),
  imageUrl: z.string().trim().url("Enter a valid image URL"),
  eventType: optionalText(80),
  city: optionalText(80),
  province: optionalText(80),
  eventDate: z
    .preprocess(emptyToUndefined, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  isFeatured: z.coerce.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export const supplierContactRequestSchema = z.object({
  supplierId: z.string().uuid(),
  serviceId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  contactName: z.string().trim().min(2, "Name is required").max(120),
  contactEmail: z.string().trim().email("Enter a valid email"),
  contactPhone: optionalPhone,
  eventDate: z
    .preprocess(emptyToUndefined, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  eventLocation: optionalText(160),
  guestCount: optionalNumber.refine(
    (value) => typeof value === "undefined" || value > 0,
    "Guest count must be greater than zero",
  ),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(1500),
});

export const toggleSupplierFavoriteSchema = z.object({
  supplierId: z.string().uuid(),
});

export type SupplierSearchInput = z.infer<typeof supplierSearchSchema>;
export type SupplierProfileInput = z.infer<typeof supplierProfileSchema>;
export type SupplierPackageInput = z.infer<typeof supplierPackageSchema>;
export type ArchiveSupplierPackageInput = z.infer<typeof archiveSupplierPackageSchema>;
export type SupplierPortfolioInput = z.infer<typeof supplierPortfolioSchema>;
export type SupplierContactRequestInput = z.infer<typeof supplierContactRequestSchema>;
