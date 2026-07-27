import { describe, expect, it } from "vitest";
import { guestInputSchema, importGuestsSchema } from "./guest.schema";

describe("guest schema", () => {
  it("normalizes optional private fields", () => {
    expect(
      guestInputSchema.parse({
        firstName: " Ana ",
        lastName: " Santos ",
        email: "",
        phone: "",
        guestGroup: "Family",
        plusOnesAllowed: "1",
        dietaryRequirements: "",
        accessibilityNotes: "",
        rsvpStatus: "pending",
      }),
    ).toMatchObject({
      firstName: "Ana",
      lastName: "Santos",
      email: null,
      phone: null,
      plusOnesAllowed: 1,
      dietaryRequirements: null,
      accessibilityNotes: null,
    });
  });

  it("rejects malformed booking IDs", () => {
    expect(
      guestInputSchema.safeParse({
        firstName: "Ana",
        lastName: "Santos",
        bookingId: "another-customer-booking",
      }).success,
    ).toBe(false);
  });

  it("caps imports at 500 rows", () => {
    const guest = { firstName: "Ana", lastName: "Santos" };
    expect(
      importGuestsSchema.safeParse({
        guests: Array.from({ length: 501 }, () => guest),
      }).success,
    ).toBe(false);
  });
});
