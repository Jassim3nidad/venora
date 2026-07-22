import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const aboutPageSource = readFileSync(
  new URL("../../../app/(marketing)/about/page.tsx", import.meta.url),
  { encoding: "utf8" },
);

describe("About page design constraints", () => {
  it("uses restrained typography without font-black or negative tracking", () => {
    expect(aboutPageSource).not.toContain("font-black");
    expect(aboutPageSource).not.toContain("tracking-[-");
  });

  it("uses local about photography instead of external hotlinks", () => {
    expect(aboutPageSource).toContain("/images/about/");
    expect(aboutPageSource).not.toContain("images.pexels.com");
    expect(aboutPageSource).not.toContain("images.unsplash.com");
  });

  it("uses a distinct local hero background image", () => {
    expect(aboutPageSource).toContain("/images/about/about-hero-background.jpg");
    expect(aboutPageSource).not.toContain("/images/landing-hero-venue-bg.png");
  });
});
