import type { Metadata } from "next";
import { InfoPageShell } from "@/components/layout/InfoPageShell";

export const metadata: Metadata = { title: "Terms of Service" };

const cards = [
  {
    title: "Using Venora",
    description:
      "Users should provide accurate information and use marketplace tools responsibly when browsing, booking, or hosting.",
  },
  {
    title: "Bookings and inquiries",
    description:
      "Venue bookings and supplier inquiries may depend on partner approval, availability, pricing, and stated policies.",
  },
  {
    title: "Partner responsibilities",
    description:
      "Venue owners and suppliers are expected to keep listings, packages, policies, and responses accurate.",
  },
  {
    title: "Platform updates",
    description:
      "Venora may update features, policies, and informational pages as the marketplace grows.",
  },
];

export default function TermsPage() {
  return (
    <InfoPageShell
      eyebrow="Legal"
      title="Terms of Service"
      description="These terms outline the general expectations for using Venora as a customer, venue partner, supplier, or marketplace participant."
      cards={cards}
      ctaLabel="Browse Venues"
      ctaHref="/venues"
      secondaryCtaLabel="Read Privacy"
      secondaryCtaHref="/privacy"
      note="This page is a concise overview and should not be treated as a final legal agreement until Venora publishes its complete terms."
    />
  );
}
