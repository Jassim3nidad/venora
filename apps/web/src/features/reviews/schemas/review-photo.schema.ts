import { z } from "zod";

export const attachReviewPhotosSchema = z.object({
  reviewId: z.string().uuid(),
  photos: z
    .array(
      z.object({
        storagePath: z.string().min(1),
        url: z.string().url(),
      }),
    )
    .min(1)
    .max(5),
});
export type AttachReviewPhotosInput = z.infer<typeof attachReviewPhotosSchema>;

export const deleteReviewPhotoSchema = z.object({
  photoId: z.string().uuid(),
});
export type DeleteReviewPhotoInput = z.infer<typeof deleteReviewPhotoSchema>;
