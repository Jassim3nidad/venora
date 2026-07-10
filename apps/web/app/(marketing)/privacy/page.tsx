import type { Metadata } from "next";
import { InfoPageShell } from "@/components/layout/InfoPageShell";

export const metadata: Metadata = { title: "Privacy Policy" };

const cards = [
  {
    title: "Information you provide",
    description:
      "Venora may collect account, profile, booking, inquiry, and marketplace activity details needed to operate the service.",
  },
  {
    title: "How information is used",
    description:
      "Information helps support venue discovery, booking workflows, account access, support, and platform improvement.",
  },
  {
    title: "Marketplace sharing",
    description:
      "Booking and inquiry details may be shared with relevant venues or suppliers so they can respond to requests.",
  },
  {
    title: "Privacy controls",
    description:
      "Users can manage account details and privacy preferences from their Venora account settings.",
  },
];

export default function PrivacyPage() {
  return (
    <InfoPageShell
      eyebrow="Legal"
      title="Privacy Policy"
      description="This page provides an overview of how Venora approaches privacy for customers, venue partners, suppliers, and marketplace users."
      cards={cards}
      ctaLabel="Manage Account"
      ctaHref="/account"
      secondaryCtaLabel="Read Terms"
      secondaryCtaHref="/terms"
      note="This overview is informational and may be updated as Venora finalizes its full privacy policy and platform operations."
    />
  );
}
