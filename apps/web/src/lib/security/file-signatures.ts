const SIGNATURES: Record<string, readonly number[]> = {
  "application/pdf": [0x25, 0x50, 0x44, 0x46, 0x2d],
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
};

function matchesAt(
  bytes: Uint8Array,
  signature: readonly number[],
  offset = 0,
) {
  return (
    bytes.length >= offset + signature.length &&
    signature.every((value, index) => bytes[offset + index] === value)
  );
}

export function hasAllowedFileSignature(
  bytes: Uint8Array,
  declaredMimeType: string,
) {
  const signature = SIGNATURES[declaredMimeType];

  if (signature) return matchesAt(bytes, signature);

  if (declaredMimeType === "image/gif") {
    return (
      matchesAt(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) ||
      matchesAt(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
    );
  }

  if (declaredMimeType === "image/webp") {
    return (
      matchesAt(bytes, [0x52, 0x49, 0x46, 0x46]) &&
      matchesAt(bytes, [0x57, 0x45, 0x42, 0x50], 8)
    );
  }

  if (
    declaredMimeType === "video/mp4" ||
    declaredMimeType === "video/quicktime"
  ) {
    return matchesAt(bytes, [0x66, 0x74, 0x79, 0x70], 4);
  }

  return false;
}

export async function fileHasAllowedSignature(
  file: Pick<File, "slice" | "type">,
) {
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  return hasAllowedFileSignature(header, file.type);
}
