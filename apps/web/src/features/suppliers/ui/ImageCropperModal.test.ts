import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(import.meta.dirname, "ImageCropperModal.tsx"),
  "utf8",
);

describe("ImageCropperModal accessibility contract", () => {
  it("names controls and exposes keyboard crop instructions", () => {
    expect(source).toContain('aria-label="Close image cropper"');
    expect(source).toContain('aria-label="Zoom image"');
    expect(source).toContain('aria-describedby="crop-keyboard-instructions"');
    expect(source).toContain('e.key === "ArrowLeft"');
    expect(source).toContain('aria-live="polite"');
  });

  it("provides a keyboard-operable reset", () => {
    expect(source).toContain("const resetCrop");
    expect(source).toContain("Reset crop");
    expect(source).toContain("containerRef.current?.focus()");
  });
});
