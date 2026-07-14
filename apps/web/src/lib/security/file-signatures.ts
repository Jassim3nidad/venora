const SIGNATURES: Record<string, readonly number[]> = {
  "application/pdf": [0x25, 0x50, 0x44, 0x46, 0x2d],
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
};

export function hasAllowedFileSignature(
  bytes: Uint8Array,
  declaredMimeType: string,
) {
  const signature = SIGNATURES[declaredMimeType];

  return Boolean(
    signature &&
    bytes.length >= signature.length &&
    signature.every((value, index) => bytes[index] === value),
  );
}
