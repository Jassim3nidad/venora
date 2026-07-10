import type { Metadata } from "next";
import { InfoPageShell } from "@/components/layout/InfoPageShell";

export const metadata: Metadata = { title: "Newsroom" };

const cards = [
  {
    title: "Platform updates",
    description:
      "Follow improvements to venue discovery, booking workflows, dashboards, and customer tools.",
  },
  {
    title: "Marketplace news",
    description:
      "Read announcements about Venora's growing event marketplace and product direction.",
  },
  {
    title: "Partnership announcements",
    description:
      "Learn about new venue, supplier, and event service partnerships as Venora expands.",
  },
];

export default function NewsroomPage() {
  return (
    <InfoPageShell
      eyebrow="Venora updates"
      title="Newsroom"
      description="A home for Venora announcements, marketplace updates, and product stories as the platform grows."
      cards={cards}
      ctaLabel="Explore Features"
      ctaHref="/features"
      secondaryCtaLabel="About Venora"
      secondaryCtaHref="/about"
    />
  );
}
