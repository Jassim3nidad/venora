import type { Metadata } from "next";
import { InfoPageShell } from "@/components/layout/InfoPageShell";

export const metadata: Metadata = { title: "Safety Information" };

const cards = [
  {
    title: "Verified listings",
    description:
      "Venue profiles are structured to surface key details like location, packages, capacity, and policies.",
  },
  {
    title: "Secure accounts",
    description:
      "Venora uses account-based access so customers, owners, suppliers, and staff use the right tools.",
  },
  {
    title: "Safe booking practices",
    description:
      "Customers should review venue details, policies, payment steps, and confirmation status before events.",
  },
  {
    title: "Reporting concerns",
    description:
      "Users can contact Venora support when a listing, booking, review, or inquiry needs attention.",
  },
];

export default function SafetyPage() {
  return (
    <InfoPageShell
      eyebrow="Trust and safety"
      title="Safety Information"
      description="Venora is designed to help customers and event businesses plan with clearer information, safer workflows, and better marketplace visibility."
      cards={cards}
      ctaLabel="Browse Verified Venues"
      ctaHref="/venues"
      secondaryCtaLabel="Visit Help Center"
      secondaryCtaHref="/help"
    />
  );
}
