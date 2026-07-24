import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getVenueInquiryMessages } from "@/src/features/venues/application/inquiry-messages-actions";
import { VenueInquiryConversation } from "@/src/features/venues/ui/VenueInquiryConversation";

export const metadata: Metadata = {
  title: "Venue Inquiry",
};
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CustomerVenueInquiryPage({ params }: Props) {
  const { id } = await params;
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: inquiry } = await supabase
    .from("inquiries")
    .select(
      "id, status, message, created_at, venue_id, customer_id, venues(name, slug)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!inquiry || !user || inquiry.customer_id !== user.id) {
    notFound();
  }

  const venue = Array.isArray(inquiry.venues)
    ? inquiry.venues[0]
    : inquiry.venues;
  const messages = await getVenueInquiryMessages(id);

  return (
    <div className="overflow-hidden rounded-[28px] border border-[#E5E7EB]/80 bg-white shadow-xl shadow-slate-200/60">
      <div className="border-b border-[#E5E7EB]/80 p-6 sm:p-8">
        <Link
          href="/account/venue-inquiries"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#6B7280] transition hover:text-[#2563EB]"
        >
          <ArrowLeft className="h-4 w-4" />
          All venue inquiries
        </Link>
        <h1 className="mt-4 text-2xl font-bold tracking-[-0.04em] text-slate-950">
          {venue?.name ?? "Venue inquiry"}
        </h1>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Continue your pre-booking conversation with the venue team.
        </p>
      </div>

      <div className="h-[65vh] min-h-[420px] p-4 sm:p-6">
        <VenueInquiryConversation
          inquiryId={inquiry.id}
          initialMessages={messages}
          currentUserId={user.id}
          isReadOnly={inquiry.status === "closed"}
          customerName="You"
          venueName={venue?.name}
          venueLink={venue?.slug ? `/venues/${venue.slug}` : undefined}
          statusLabel={String(inquiry.status).replace(/_/g, " ")}
          counterpartLabel="the venue team"
        />
      </div>
    </div>
  );
}
