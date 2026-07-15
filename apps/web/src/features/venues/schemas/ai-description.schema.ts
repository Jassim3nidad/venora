import { z } from "zod";

export const generatedContentTypeOptions = [
  "description",
  "seo_meta",
  "package_description",
] as const;

export const generatedContentToneOptions = [
  "elegant",
  "casual",
  "luxury",
] as const;

export const generateVenueDescriptionRequestSchema = z.object({
  venueId: z.string().uuid(),
  contentType: z.enum(generatedContentTypeOptions),
  packageId: z.string().uuid().nullable().optional(),
  tone: z.enum(generatedContentToneOptions),
});
export type GenerateVenueDescriptionRequest = z.infer<
  typeof generateVenueDescriptionRequestSchema
>;

export const generatedContentSchema = z.object({
  id: z.string(),
  venueId: z.string(),
  contentType: z.enum(generatedContentTypeOptions),
  generatedText: z.string(),
  status: z.enum(["draft", "approved", "rejected"]),
  createdAt: z.string(),
});
export type GeneratedContent = z.infer<typeof generatedContentSchema>;

export const generateVenueDescriptionResponseSchema = z.object({
  content: generatedContentSchema,
});
export type GenerateVenueDescriptionResponse = z.infer<
  typeof generateVenueDescriptionResponseSchema
>;
