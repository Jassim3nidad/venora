import type { Metadata } from "next";
import { InfoPageShell } from "@/components/layout/InfoPageShell";

export const metadata: Metadata = { title: "Hosting Resources" };

const cards = [
  {
    title: "Create strong listings",
    description:
      "Add clear venue descriptions, photos, capacity details, packages, amenities, and policies.",
  },
  {
    title: "Manage bookings",
    description:
      "Use booking records and calendars to prepare for inquiries, pending requests, and confirmed events.",
  },
  {
    title: "Improve venue visibility",
    description:
      "Keep profile details complete so customers can compare your venue more confidently.",
  },
  {
    title: "Use analytics",
    description:
      "Review dashboard insights to understand venue performance and customer interest over time.",
  },
];

export default function HostingResourcesPage() {
  return (
    <InfoPageShell
      eyebrow="Partner resources"
      title="Hosting Resources"
      description="Practical guidance for venue partners who want to create better listings, manage bookings, and grow their presence on Venora."
      cards={cards}
      ctaLabel="List Your Venue"
      ctaHref="/account/become-partner"
      secondaryCtaLabel="Cover for Hosts"
      secondaryCtaHref="/host-protection"
    />
  );
}
