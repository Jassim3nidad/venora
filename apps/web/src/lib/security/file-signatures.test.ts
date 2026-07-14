import { describe, expect, it } from "vitest";
import { hasAllowedFileSignature } from "./file-signatures";

describe("hasAllowedFileSignature", () => {
  it.each([
    ["application/pdf", [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]],
    ["image/jpeg", [0xff, 0xd8, 0xff, 0xe0]],
    ["image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
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

  it("rejects truncated files", () => {
    expect(
      hasAllowedFileSignature(Uint8Array.from([0x89, 0x50]), "image/png"),
    ).toBe(false);
  });
});
