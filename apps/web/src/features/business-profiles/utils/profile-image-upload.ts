export type BusinessProfileImageKind = "logo" | "cover";

export const BUSINESS_PROFILE_IMAGE_BUCKET = "business-profiles";
export const BUSINESS_PROFILE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const BUSINESS_PROFILE_IMAGE_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

const EXTENSIONS_BY_MIME_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

type ImageFileLike = {
  type: string;
  size: number;
};

export function validateBusinessProfileImage(file: ImageFileLike) {
  if (!BUSINESS_PROFILE_IMAGE_ACCEPTED_TYPES.includes(file.type as never)) {
    return "Please choose a JPEG, PNG, WEBP, or GIF image.";
  }

  if (file.size > BUSINESS_PROFILE_IMAGE_MAX_BYTES) {
    return "Image must be 10 MB or smaller.";
  }

  return null;
}

export function getBusinessProfileImageExtension(
  fileName: string,
  mimeType: string,
) {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension && ["jpg", "jpeg", "png", "webp", "gif"].includes(extension)) {
    return extension === "jpeg" ? "jpg" : extension;
  }

  return EXTENSIONS_BY_MIME_TYPE[mimeType] ?? "jpg";
}

function getSafeBaseName(fileName: string, fallback: BusinessProfileImageKind) {
  const baseName = fileName.replace(/\.[^/.]+$/, "");
  const safeName = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return safeName || fallback;
}

export function buildBusinessProfileImagePath({
  organizationId,
  kind,
  fileName,
  mimeType,
  uniqueId,
}: {
  organizationId: string;
  kind: BusinessProfileImageKind;
  fileName: string;
  mimeType: string;
  uniqueId: string;
}) {
  const extension = getBusinessProfileImageExtension(fileName, mimeType);
  const safeName = getSafeBaseName(fileName, kind);

  return `${organizationId}/business-profile/${kind}/${uniqueId}-${safeName}.${extension}`;
}
