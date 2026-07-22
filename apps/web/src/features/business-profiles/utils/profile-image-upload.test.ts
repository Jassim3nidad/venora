import { describe, expect, it } from "vitest";
import {
  BUSINESS_PROFILE_IMAGE_MAX_BYTES,
  buildBusinessProfileImagePath,
  getBusinessProfileImageExtension,
  validateBusinessProfileImage,
} from "./profile-image-upload";

describe("business profile image uploads", () => {
  it("accepts the image formats allowed by the business-profiles bucket", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", "image/gif"]) {
      expect(validateBusinessProfileImage({ type, size: 1024 })).toBeNull();
    }
  });

  it("rejects non-image files and oversized images", () => {
    expect(validateBusinessProfileImage({ type: "application/pdf", size: 1024 })).toContain(
      "JPEG, PNG, WEBP, or GIF",
    );
    expect(
      validateBusinessProfileImage({
        type: "image/png",
        size: BUSINESS_PROFILE_IMAGE_MAX_BYTES + 1,
      }),
    ).toContain("10 MB or smaller");
  });

  it("builds storage paths under the organization folder for RLS ownership checks", () => {
    expect(
      buildBusinessProfileImagePath({
        organizationId: "org-123",
        kind: "cover",
        fileName: "Grand Ballroom Cover!!.PNG",
        mimeType: "image/png",
        uniqueId: "abc",
      }),
    ).toBe("org-123/business-profile/cover/abc-grand-ballroom-cover.png");
  });

  it("falls back to the MIME type when the file name has no extension", () => {
    expect(getBusinessProfileImageExtension("logo", "image/webp")).toBe("webp");
  });
});
