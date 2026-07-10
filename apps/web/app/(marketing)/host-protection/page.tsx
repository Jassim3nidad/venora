import type { Metadata } from "next";
import { InfoPageShell } from "@/components/layout/InfoPageShell";

export const metadata: Metadata = { title: "Cover for Hosts" };

const cards = [
  {
    title: "Booking protection",
    description:
      "Structured booking requests help hosts understand event details before confirming availability.",
  },
  {
    title: "Verified customers",
    description:
      "Customer accounts, booking records, and communication history help support safer coordination.",
  },
  {
    title: "Dashboard tools",
    description:
      "Hosts can manage venue details, packages, calendars, staff, bookings, and operational updates.",
  },
  {
    title: "Support and reports",
    description:
      "Venue teams can raise concerns and keep marketplace activity easier to review with Venora support.",
  },
];

export default function HostProtectionPage() {
  return (
    <InfoPageShell
      eyebrow="Hosting support"
      title="Cover for Hosts"
      description="Venora gives venue partners clearer tools, structured booking workflows, and support channels for managing event requests with confidence."
      cards={cards}
      ctaLabel="Become a Venue Partner"
      ctaHref="/account/become-partner"
      secondaryCtaLabel="Hosting Resources"
      secondaryCtaHref="/hosting-resources"
    />
  );
}
