import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function uiSource(fileName: string) {
  return readFileSync(new URL(`./${fileName}`, import.meta.url), "utf8");
}

function repositorySource(relativePath: string) {
  return readFileSync(
    new URL(`../../../../${relativePath}`, import.meta.url),
    "utf8",
  );
}

describe("immersive public venue experience contract", () => {
  it("connects the public route to canonical metadata, JSON-LD, and the shared profile", () => {
    const route = repositorySource("app/(customer)/venues/[slug]/page.tsx");

    expect(route).toContain("generateMetadata");
    expect(route).toContain("alternates: { canonical:");
    expect(route).toContain('type="application/ld+json"');
    expect(route).toContain("buildPublicVenueProfile");
    expect(route).toContain("structuredProfile");
    expect(route).toContain("eventPlanFit={eventPlanFit}");
    expect(route).toContain("<VenueDetails");
  });

  it("keeps the cinematic hero accessible and motion-aware", () => {
    const hero = uiSource("ImmersiveVenueHero.tsx");

    expect(hero).toContain('aria-labelledby="venue-title"');
    expect(hero).toContain('id="venue-title"');
    expect(hero.match(/<h1/g)).toHaveLength(1);
    expect(hero).toContain("priority");
    expect(hero).toContain("muted");
    expect(hero).toContain("playsInline");
    expect(hero).toContain('preload="metadata"');
    expect(hero).toContain("prefers-reduced-motion: reduce");
    expect(hero).toContain("motion-reduce:transition-none");
  });

  it("preserves the real save, share, inquiry, Event Plan, availability, and booking paths", () => {
    const hero = uiSource("ImmersiveVenueHero.tsx");
    const decisions = uiSource("ImmersiveVenueDecisionSections.tsx");

    expect(hero).toContain("toggleFavoriteAction");
    expect(hero).toContain("navigator.share");
    expect(decisions).toContain("<InquiryDialog");
    expect(decisions).toContain("profile.actions.eventPlanHref");
    expect(decisions).toContain('href="#booking"');
    expect(decisions).toContain("profile.actions.bookingHref");
  });

  it("supports keyboard, touch, focus recovery, and mobile safe areas", () => {
    const gallery = uiSource("ImmersiveVenueGallery.tsx");
    const booking = uiSource("BookingSidebar.tsx");

    expect(gallery).toContain('event.key === "ArrowLeft"');
    expect(gallery).toContain('event.key === "ArrowRight"');
    expect(gallery).toContain("onTouchStart");
    expect(gallery).toContain("onTouchEnd");
    expect(gallery).toContain("lastTriggerRef.current?.focus()");
    expect(booking).toContain("env(safe-area-inset-bottom)");
    expect(booking).toContain("pr-[5.5rem]");
  });

  it("keeps the lower page image-led without inventing Event Plan scoring", () => {
    const eventPlan = uiSource("ImagineYourEventHere.tsx");
    const gallery = uiSource("ImmersiveVenueGallery.tsx");
    const spaces = uiSource("VenueSpaceExplorer.tsx");

    expect(eventPlan).toContain("profile.hero.image ?? profile.gallery[0]");
    expect(eventPlan).toMatch(/real\s+spaces,\s+capacities,\s+and\s+features/);
    expect(eventPlan).not.toMatch(/match (?:percentage|score)/i);
    expect(gallery).toContain("isOnlyItem");
    expect(spaces).toContain("max-w-[90rem]");
  });

  it("keeps authenticated drafts noindex and on the shared preview model", () => {
    const preview = repositorySource(
      "app/(venue-owner)/dashboard/venues/[id]/experience/preview/page.tsx",
    );

    expect(preview).toContain("robots: { index: false, follow: false }");
    expect(preview).toContain("buildPublicVenueProfile");
    expect(preview).toContain('mode: "preview"');
    expect(preview).toContain("findDraftProfileForVenue");
    expect(preview).toContain("key={space.key}");
  });

  it("does not promise unsupported immersive workflows", () => {
    const publicUi = [
      uiSource("VenueDetails.tsx"),
      uiSource("ImmersiveVenueHero.tsx"),
      uiSource("ImagineYourEventHere.tsx"),
      uiSource("VenueSpaceExplorer.tsx"),
      uiSource("ImmersiveVenueDecisionSections.tsx"),
    ].join("\n");

    expect(publicUi).not.toMatch(/schedule (?:a )?site visit/i);
    expect(publicUi).not.toMatch(/\b360(?:-degree)? tour\b/i);
    expect(publicUi).not.toMatch(/\bfloor plan\b/i);
    expect(publicUi).not.toMatch(/\bhotspots?\b/i);
    expect(publicUi).not.toMatch(/\bmatch (?:percentage|score)\b/i);
  });

  it("declares the global smooth-scroll behavior to Next.js", () => {
    const layout = repositorySource("app/layout.tsx");
    expect(layout).toContain('data-scroll-behavior="smooth"');
  });
});
