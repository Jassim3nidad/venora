import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { formatPublicPackagePrice } from "./ImmersiveVenueDecisionSections";

function source(fileName: string) {
  return readFileSync(new URL(`./${fileName}`, import.meta.url), "utf8");
}

function previewSource() {
  return readFileSync(
    new URL(
      "../../../../app/(venue-owner)/dashboard/venues/[id]/experience/preview/page.tsx",
      import.meta.url,
    ),
    "utf8",
  );
}

describe("immersive venue decision sections", () => {
  it("formats only real package prices and units", () => {
    expect(formatPublicPackagePrice(120000, "per_event")).toContain("₱120,000");
    expect(formatPublicPackagePrice(120000, "per_event")).toContain("per event");
    expect(formatPublicPackagePrice(null, "per_event")).toBe("Price on request");
  });

  it("uses native accessible FAQs and hides absent practical data", () => {
    const decisionSource = source("ImmersiveVenueDecisionSections.tsx");
    expect(decisionSource).toContain("<details");
    expect(decisionSource).toContain("profile.logistics.map");
    expect(decisionSource).not.toContain("N/A");
    expect(decisionSource).not.toContain("Schedule a Site Visit");
  });

  it("keeps inquiry, availability, booking, and Event Plan actions working", () => {
    const decisionSource = source("ImmersiveVenueDecisionSections.tsx");
    const bookingSource = source("BookingSidebar.tsx");
    expect(decisionSource).toContain("<InquiryDialog");
    expect(decisionSource).toContain('href="#booking"');
    expect(decisionSource).toContain("profile.actions.bookingHref");
    expect(decisionSource).toContain("profile.actions.eventPlanHref");
    expect(bookingSource).toContain("Ask the venue a question");
  });

  it("preserves restrained desktop and safe-area mobile booking behavior", () => {
    const bookingSource = source("BookingSidebar.tsx");
    expect(bookingSource).toContain('data-testid="venue-booking-sidebar"');
    expect(bookingSource).toContain("max-h-[calc(100vh-10.5rem)]");
    expect(bookingSource).toContain("env(safe-area-inset-bottom)");
  });

  it("does not render invented fallback policies", () => {
    const detailsSource = source("VenueDetails.tsx");
    expect(detailsSource).not.toContain("Street parking or public pay lots are nearby");
    expect(detailsSource).not.toContain("Standard booking policies apply");
    expect(detailsSource).not.toContain("Cancellations inside 14 days");
  });

  it("shapes authenticated draft previews through the shared preview model", () => {
    const preview = previewSource();
    expect(preview).toContain("buildPublicVenueProfile");
    expect(preview).toContain('mode: "preview"');
    expect(preview).toContain("robots: { index: false, follow: false }");
    expect(preview).toContain("previewProfile.logistics.map");
  });
});
