import { describe, expect, it } from "vitest";
import {
  getImmersiveSectionLinks,
  shouldPlayHeroVideo,
} from "./ImmersiveVenueHero";

describe("immersive venue hero behavior", () => {
  it("autoplays only when video and motion preferences allow it", () => {
    expect(shouldPlayHeroVideo(true, false, false)).toBe(true);
    expect(shouldPlayHeroVideo(false, false, false)).toBe(false);
    expect(shouldPlayHeroVideo(true, true, false)).toBe(false);
    expect(shouldPlayHeroVideo(true, false, true)).toBe(false);
  });

  it("builds navigation only for known sections that are rendered", () => {
    expect(
      getImmersiveSectionLinks(
        ["overview", "spaces", "unknown", "packages", "reviews"],
        ["overview", "packages", "reviews"],
      ),
    ).toEqual([
      { id: "overview", label: "Overview", href: "#overview" },
      { id: "packages", label: "Packages", href: "#packages" },
      { id: "reviews", label: "Reviews", href: "#reviews" },
    ]);
  });
});
