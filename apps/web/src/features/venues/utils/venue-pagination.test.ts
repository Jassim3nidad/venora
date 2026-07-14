import { describe, expect, it } from "vitest";
import { getRemainingVenueCount } from "./venue-pagination";

describe("getRemainingVenueCount", () => {
  it("returns the number of hidden venues", () => {
    expect(getRemainingVenueCount(25, 12)).toBe(13);
  });

  it("returns zero when all venues are visible", () => {
    expect(getRemainingVenueCount(12, 12)).toBe(0);
  });

  it("never returns a negative count", () => {
    expect(getRemainingVenueCount(10, 12)).toBe(0);
  });
});
