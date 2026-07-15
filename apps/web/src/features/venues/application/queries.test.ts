import { describe, expect, it } from "vitest";
import { parseMarketplaceLocation } from "./queries";

describe("parseMarketplaceLocation", () => {
  it("splits a suggested city and province", () => {
    expect(parseMarketplaceLocation("Alfonso, Cavite")).toEqual({
      locality: "Alfonso",
      province: "Cavite",
    });
  });

  it("keeps free-form single-part locations valid", () => {
    expect(parseMarketplaceLocation("Tagaytay")).toEqual({
      locality: "Tagaytay",
    });
  });

  it("removes PostgREST control characters", () => {
    expect(parseMarketplaceLocation('Alfonso(), "Cavite"')).toEqual({
      locality: "Alfonso",
      province: "Cavite",
    });
  });
});
