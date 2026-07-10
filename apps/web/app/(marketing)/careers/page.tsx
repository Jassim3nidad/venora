import type { Metadata } from "next";
import { InfoPageShell } from "@/components/layout/InfoPageShell";

export const metadata: Metadata = { title: "Careers" };

const cards = [
  {
    title: "Build the future of event planning",
    description:
      "Venora is shaping smarter venue discovery and marketplace tools for event teams.",
  },
  {
    title: "Internship opportunities",
    description:
      "Future internship openings may support product, design, operations, marketing, and engineering work.",
  },
  {
    title: "Product and engineering roles",
    description:
      "Venora values builders who care about usable software, reliable workflows, and customer trust.",
  },
  {
    title: "Coming soon",
    description:
      "Open roles are not listed yet. Check back for updates as Venora expands the team.",
  },
];

export default function CareersPage() {
  return (
    <InfoPageShell
      eyebrow="Careers"
      title="Careers at Venora"
      description="Help build a more trusted and intelligent event marketplace for customers, venues, suppliers, and event professionals."
      cards={cards}
      ctaLabel="Learn About Venora"
      ctaHref="/about"
      secondaryCtaLabel="Read Newsroom"
      secondaryCtaHref="/newsroom"
    />
  );
}
