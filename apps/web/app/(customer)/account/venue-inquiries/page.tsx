import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Venue Inquiries",
};
export const dynamic = "force-dynamic";

export default async function CustomerVenueInquiriesPage() {
  const supabase = (await createClient()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: inquiries } = await supabase
    .from("inquiries")
    .select(
      "id, status, message, created_at, venues(name, slug, city, province)",
    )
    .eq("customer_id", user!.id)
    .order("created_at", { ascending: false });

  const rows = (inquiries ?? []) as any[];

  return (
    <div className="overflow-hidden rounded-[28px] border border-[#E5E7EB]/80 bg-white shadow-xl shadow-slate-200/60">
      <div className="border-b border-[#E5E7EB]/80 p-6 sm:p-8">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
          Messages
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-[-0.04em] text-slate-950">
          Venue inquiries
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
          Pre-booking questions you sent to venues, with replies from the venue
          team.
        </p>
      </div>

      <div className="p-6 sm:p-8">
        {rows.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EFF6FF] text-[#2563EB]">
              <MessageSquareText className="h-5 w-5" />
            </div>
            <p className="mt-4 text-sm font-bold text-slate-700">
              No venue inquiries yet
            </p>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Ask a venue a question from its profile page to start a thread.
            </p>
            <Link
              href="/venues"
              className="mt-5 inline-flex rounded-2xl bg-[#2563EB] px-4 py-2.5 text-sm font-extrabold text-white hover:bg-[#1D4ED8]"
            >
              Browse venues
            </Link>
          </div>
        ) : (
          <ul className="grid gap-3">
            {rows.map((inquiry) => {
              const venue = Array.isArray(inquiry.venues)
                ? inquiry.venues[0]
                : inquiry.venues;
              return (
                <li key={inquiry.id}>
                  <Link
                    href={`/account/venue-inquiries/${inquiry.id}`}
                    className="block rounded-3xl border border-[#E5E7EB] bg-[#F9FAFB] p-5 transition hover:border-[#BFDBFE] hover:bg-[#F8FBFF]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-black text-slate-950">
                          {venue?.name ?? "Venue"}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {[venue?.city, venue?.province]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#EFF6FF] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#1D4ED8]">
                        {String(inquiry.status).replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm font-medium text-slate-600">
                      {inquiry.message}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
