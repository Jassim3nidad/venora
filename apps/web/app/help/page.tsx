import type { Metadata } from "next";
import { InfoPageShell } from "@/components/layout/InfoPageShell";

export const metadata: Metadata = { title: "Help & Support" };

const cards = [
  {
    title: "Account & Profile",
    description:
      "Manage your personal details, secure your login, and update your communication preferences in your account settings.",
  },
  {
    title: "Bookings & Payments",
    description:
      "View your venue reservations, track supplier inquiries, and access your billing history directly from your dashboard.",
  },
  {
    title: "Contact Support",
    description:
      "Need direct assistance? Our team is ready to help. Email us at support@venora.com with your booking reference.",
  },
  {
    title: "Disputes & Refunds",
    description:
      "Learn how to raise cases for platform review if you encounter issues with a venue or supplier that require mediation.",
  },
];

export default function HelpPage() {
  return (
    <InfoPageShell
      eyebrow="Help Center"
      title="How can we help?"
      description="Find answers to common questions, learn how to manage your bookings, and get in touch with Venora support."
      cards={cards}
      ctaLabel="View My Account"
      ctaHref="/account"
      secondaryCtaLabel="Browse Venues"
      secondaryCtaHref="/venues"
      note="If you are a Venue Owner, Event Coordinator, or Supplier, you can access role-specific support options directly from your dedicated enterprise dashboard."
      includeFooter={true}
    />
  );
}
