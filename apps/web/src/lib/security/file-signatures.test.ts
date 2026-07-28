import { describe, expect, it } from "vitest";
import { hasAllowedFileSignature } from "./file-signatures";

describe("hasAllowedFileSignature", () => {
  it.each([
    ["application/pdf", [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]],
    ["image/jpeg", [0xff, 0xd8, 0xff, 0xe0]],
    ["image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    ["image/gif", [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
    [
      "image/webp",
      [0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50],
    ],
    [
      "video/mp4",
      [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d],
    ],
    [
      "video/quicktime",
      [0x00, 0x00, 0x00, 0x14, 0x66, 0x74, 0x79, 0x70, 0x71, 0x74, 0x20, 0x20],
    ],
  ])("accepts a valid %s signature", (mimeType, bytes) => {
    expect(hasAllowedFileSignature(Uint8Array.from(bytes), mimeType)).toBe(
      true,
    );
  });

  it("rejects HTML disguised as an image", () => {
    expect(
      hasAllowedFileSignature(
        new TextEncoder().encode("<html><script>alert(1)</script>"),
        "image/jpeg",
      ),
    ).toBe(false);
  });

  it("rejects a signature that does not match the declared MIME type", () => {
    expect(
      hasAllowedFileSignature(
        Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d]),
        "image/png",
      ),
    ).toBe(false);
  });

  it("rejects unsupported MIME types", () => {
    expect(
      hasAllowedFileSignature(Uint8Array.from([0x4d, 0x5a]), "text/html"),
    ).toBe(false);
  });

  it("rejects a RIFF file without a WEBP marker", () => {
    expect(
      hasAllowedFileSignature(
        Uint8Array.from([
          0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00, 0x41, 0x56, 0x49,
          0x20,
        ]),
        "image/webp",
      ),
    ).toBe(false);
  });

  it("rejects truncated files", () => {
    expect(
      hasAllowedFileSignature(Uint8Array.from([0x89, 0x50]), "image/png"),
    ).toBe(false);
  });
});
