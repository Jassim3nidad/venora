import type { Metadata } from "next";
import { InfoPageShell } from "@/components/layout/InfoPageShell";

export const metadata: Metadata = { title: "Help Center" };

const cards = [
  {
    title: "Booking support",
    description:
      "Learn how venue requests work, what happens after submitting a booking, and where to track updates.",
  },
  {
    title: "Account support",
    description:
      "Find guidance for profile details, passwords, notifications, payments, and privacy settings.",
  },
  {
    title: "Supplier inquiries",
    description:
      "Understand how to contact suppliers connected to your event and manage inquiry next steps.",
  },
  {
    title: "Contact support",
    description:
      "Need help with something specific? Reach the Venora team at support@venora.com.",
  },
];

export default function HelpCenterPage() {
  return (
    <InfoPageShell
      eyebrow="Support"
      title="Help Center"
      description="Find quick guidance for bookings, accounts, venue discovery, supplier inquiries, and the tools that keep your event planning organized."
      cards={cards}
      ctaLabel="Browse Venues"
      ctaHref="/venues"
      secondaryCtaLabel="View Account"
      secondaryCtaHref="/account"
      includeFooter
    />
  );
}
