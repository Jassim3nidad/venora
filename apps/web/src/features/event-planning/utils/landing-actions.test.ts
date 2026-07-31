import { describe, expect, it } from "vitest";
import { landingPrimaryActions } from "./landing-actions";

describe("landing primary actions", () => {
  it("links customers to event planning while keeping venue browsing available", () => {
    expect(landingPrimaryActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Start planning your event",
          href: "/plan-event",
        }),
        expect.objectContaining({
          label: "Browse venues",
          href: "/venues",
        }),
      ]),
    );
  });
});
