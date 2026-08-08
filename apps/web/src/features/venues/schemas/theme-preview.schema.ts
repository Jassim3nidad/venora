import { z } from "zod";
import {
  CUSTOM_THEME,
  MAX_CUSTOM_PROMPT_LENGTH,
  venueThemes,
} from "@venora/lib";

export const venueThemeSchema = z.enum(venueThemes);

/** The eight built-in themes plus the `custom` sentinel. */
export const themeSelectionSchema = z.union([
  venueThemeSchema,
  z.literal(CUSTOM_THEME),
]);

export const generateThemePreviewRequestSchema = z
  .object({
    venueId: z.string().uuid(),
    photoId: z.string().uuid(),
    theme: themeSelectionSchema,
    customPrompt: z.string().trim().min(3).max(MAX_CUSTOM_PROMPT_LENGTH).nullable(),
  })
  // Custom text and the `custom` theme imply each other, mirroring the CHECK
  // constraint on venue_theme_previews.
  .refine(
    (value) => (value.theme === CUSTOM_THEME) === (value.customPrompt !== null),
    { message: "Custom theme text is required for the custom theme, and only for it." },
  );
export type GenerateThemePreviewRequest = z.infer<
  typeof generateThemePreviewRequestSchema
>;

export const themePreviewSchema = z.object({
  status: z.enum(["ready", "pending", "failed"]),
  theme: themeSelectionSchema,
  url: z.string().url().nullable(),
  cached: z.boolean(),
});
export type ThemePreview = z.infer<typeof themePreviewSchema>;

export const generateThemePreviewResponseSchema = z.object({
  preview: themePreviewSchema,
});
export type GenerateThemePreviewResponse = z.infer<
  typeof generateThemePreviewResponseSchema
>;
