import { describe, expect, it } from "vitest";

import { mergeAmenityNames } from "./venue-mappers";

describe("mergeAmenityNames", () => {
  it("combines relational and custom amenities without duplicate names", () => {
    expect(
      mergeAmenityNames(["Parking", "High-speed WiFi"], [
        "  Valet Parking ",
        "parking",
        "",
        "Grand Piano",
      ]),
    ).toEqual(["Parking", "High-speed WiFi", "Valet Parking", "Grand Piano"]);
  });
});
