import { describe, expect, it } from "vitest";
import { buildGuestCsv, parseGuestCsv } from "./csv";

const guest = {
  first_name: "Ana",
  last_name: "Santos",
  email: "ana@example.com",
  phone: "+63 900 000 0000",
  guest_group: "Family",
  plus_ones_allowed: 1,
  dietary_requirements: "Nut allergy",
  accessibility_notes: "Step-free access",
  rsvp_status: "attending" as const,
};

describe("guest CSV", () => {
  it("parses aliases, quoted commas, and defaults", () => {
    const rows = parseGuestCsv(
      [
        "First Name,Last Name,Group,Dietary,RSVP",
        'Ana,Santos,Family,"No nuts, shellfish",attending',
      ].join("\n"),
    );

    expect(rows).toEqual([
      expect.objectContaining({
        firstName: "Ana",
        lastName: "Santos",
        guestGroup: "Family",
        dietaryRequirements: "No nuts, shellfish",
        plusOnesAllowed: 0,
        rsvpStatus: "attending",
      }),
    ]);
  });

  it("rejects CSV without required names", () => {
    expect(() => parseGuestCsv("email\nana@example.com")).toThrow(
      'missing required "first_name"',
    );
  });

  it("rejects invalid RSVP values with row number", () => {
    expect(() =>
      parseGuestCsv("first_name,last_name,rsvp\nAna,Santos,unknown"),
    ).toThrow("CSV row 2");
  });

  it("rejects oversized guest lists before import", () => {
    const rows = Array.from(
      { length: 501 },
      (_, index) => `Guest${index},Santos`,
    );

    expect(() =>
      parseGuestCsv(["first_name,last_name", ...rows].join("\n")),
    ).toThrow("limited to 500 guests");
  });

  it("rejects oversized CSV files before parsing", () => {
    expect(() =>
      parseGuestCsv(`first_name,last_name\n${"A".repeat(1_000_001)},Santos`),
    ).toThrow("1 MB or smaller");
  });

  it("rejects malformed duplicate and extra columns", () => {
    expect(() =>
      parseGuestCsv("first_name,last_name,last_name\nAna,Santos,Santos"),
    ).toThrow("duplicate columns");
    expect(() =>
      parseGuestCsv("first_name,last_name\nAna,Santos,Unexpected"),
    ).toThrow("too many columns");
  });

  it("excludes sensitive values by default", () => {
    const csv = buildGuestCsv([guest]);

    expect(csv).not.toContain("ana@example.com");
    expect(csv).not.toContain("Nut allergy");
    expect(csv).toContain('"Ana","Santos","Family"');
  });

  it("includes sensitive values only when requested", () => {
    const csv = buildGuestCsv([guest], { includeSensitive: true });

    expect(csv).toContain("ana@example.com");
    expect(csv).toContain("Step-free access");
  });

  it("neutralizes spreadsheet formulas", () => {
    const csv = buildGuestCsv([
      { ...guest, first_name: '=HYPERLINK("https://example.com")' },
    ]);

    expect(csv).toContain('"\'=HYPERLINK(""https://example.com"")"');
  });
});
