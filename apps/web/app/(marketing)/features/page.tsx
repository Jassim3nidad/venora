import type { Metadata } from "next";
import { InfoPageShell } from "@/components/layout/InfoPageShell";

export const metadata: Metadata = { title: "New Features" };

const cards = [
  {
    title: "Smart search",
    description:
      "Search naturally by location, guest count, event type, budget, and venue preferences.",
  },
  {
    title: "Booking management",
    description:
      "Track requests, confirmations, booking details, and event status from one customer flow.",
  },
  {
    title: "Supplier marketplace",
    description:
      "Connect with event professionals who can support catering, styling, media, and more.",
  },
  {
    title: "Verified reviews",
    description:
      "Customer reviews and ratings help future planners compare venues with more confidence.",
  },
];

export default function FeaturesPage() {
  return (
    <InfoPageShell
      eyebrow="Product updates"
      title="New Features"
      description="See the Venora features designed to make venue discovery, booking, supplier inquiries, and event planning easier."
      cards={cards}
      ctaLabel="Browse Venues"
      ctaHref="/venues"
      secondaryCtaLabel="Read Newsroom"
      secondaryCtaHref="/newsroom"
    />
  );
}
