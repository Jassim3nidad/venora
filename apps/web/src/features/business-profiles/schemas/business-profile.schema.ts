import { z } from "zod";

export const businessVisibilityLevelSchema = z.enum(["exact", "city_province", "province", "hidden"]);

export const businessIdentitySchema = z.object({
  display_name: z.string().min(2, "Display name must be at least 2 characters").max(100),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  legal_name: z.string().max(100).nullable().optional(),
  tagline: z.string().max(80).nullable().optional(),
  primary_category: z.string().max(50).nullable().optional(),
  year_established: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear())
    .nullable()
    .optional(),
  logo_path: z.string().nullable().optional(),
  cover_image_path: z.string().nullable().optional(),
});

export const businessAboutSchema = z.object({
  short_description: z.string().max(250).nullable().optional(),
  about: z.string().max(3000).nullable().optional(),
});

export const businessContactSchema = z.object({
  city: z.string().max(50).nullable().optional(),
  province: z.string().max(50).nullable().optional(),
  country_code: z.string().length(2).nullable().optional(),
  private_address: z.string().max(200).nullable().optional(),
  address_visibility: businessVisibilityLevelSchema,
  public_email: z.string().email("Invalid email").nullable().optional(),
  email_visibility: z.boolean(),
  public_phone: z.string().max(20).nullable().optional(),
  phone_visibility: z.boolean(),
  website_url: z
    .string()
    .url("Must be a valid URL")
    .regex(/^https?:\/\//, "URL must start with http or https")
    .nullable()
    .optional(),
});

export const businessPortfolioItemSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(2).max(120),
  event_type: z.string().max(50).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  event_year: z.number().int().min(1900).max(new Date().getFullYear()).nullable().optional(),
  cover_image_path: z.string().nullable().optional(),
  associated_venue_id: z.string().uuid().nullable().optional(),
  is_featured: z.boolean().default(false),
  is_visible: z.boolean().default(true),
  display_order: z.number().int().default(0),
});

export const businessTeamMemberSchema = z.object({
  id: z.string().uuid().optional(),
  full_name: z.string().min(2).max(100),
  position: z.string().max(50).nullable().optional(),
  biography: z.string().max(800).nullable().optional(),
  photo_path: z.string().nullable().optional(),
  associated_venue_id: z.string().uuid().nullable().optional(),
  years_of_experience: z.number().int().min(0).max(100).nullable().optional(),
  is_visible: z.boolean().default(true),
  display_order: z.number().int().default(0),
});

export const businessSocialLinkSchema = z.object({
  id: z.string().uuid().optional(),
  platform: z.string().min(1).max(50),
  url: z.string().url().regex(/^https?:\/\//),
  is_visible: z.boolean().default(true),
  display_order: z.number().int().default(0),
});

export const businessProfilePolicySchema = z.object({
  id: z.string().uuid().optional(),
  policy_type: z.string().min(1).max(50),
  title: z.string().min(1).max(100),
  summary: z.string().min(1).max(1500),
  is_visible: z.boolean().default(true),
  display_order: z.number().int().default(0),
});
