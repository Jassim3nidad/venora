import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { RsvpResponseForm } from "./RsvpResponseForm";

export const metadata: Metadata = {
  title: "Event RSVP",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Invitation = {
  guest_name: string;
  event_date: string | null;
  venue_name: string | null;
  rsvp_status: string;
  plus_ones_allowed: number;
  plus_ones_attending: number;
  rsvp_deadline: string | null;
};

export default async function GuestRsvpPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase.rpc("get_guest_rsvp_invitation", {
    p_token: token,
  });
  const invitation = (data?.[0] ?? null) as Invitation | null;

  if (error || !invitation) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-950">
            Invitation unavailable
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            This RSVP link is invalid, expired, or has been revoked by the event
            host.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex font-bold text-blue-700 hover:underline"
          >
            Visit Venora
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
          You&apos;re invited
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Hello, {invitation.guest_name}
        </h1>
        <div className="mt-5 space-y-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
          <p className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-blue-600" />
            {invitation.event_date ?? "Date to be confirmed"}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            {invitation.venue_name ?? "Venue to be confirmed"}
          </p>
        </div>
        {invitation.rsvp_deadline ? (
          <p className="mt-4 text-xs text-slate-500">
            Please respond by{" "}
            {new Date(invitation.rsvp_deadline).toLocaleDateString("en-PH", {
              dateStyle: "long",
            })}
            .
          </p>
        ) : null}
        <RsvpResponseForm
          token={token}
          initialStatus={invitation.rsvp_status}
          plusOnesAllowed={invitation.plus_ones_allowed}
          initialPlusOnes={invitation.plus_ones_attending}
        />
      </section>
    </main>
  );
}
