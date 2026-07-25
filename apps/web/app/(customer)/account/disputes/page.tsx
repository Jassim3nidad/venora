import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Gavel } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Disputes",
};

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-amber-50 text-amber-700 border-amber-200",
  under_review: "bg-blue-50 text-blue-700 border-blue-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-slate-100 text-slate-600 border-slate-200",
};

function pretty(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function AccountDisputesPage() {
  const supabase = (await createClient()) as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/account/disputes");

  const { data: disputes, error } = await supabase
    .from("disputes")
    .select(
      "id, status, category, reason, created_at, resolved_at, resolution_notes, booking_id, venues(name)",
    )
    .eq("raised_by", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-950">
          Disputes
        </h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Cases you raised from eligible bookings. Admins review open → under
          review → resolved or rejected.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error.message}
        </div>
      ) : null}

      {!error && (!disputes || disputes.length === 0) ? (
        <div className="flex flex-col items-center gap-3 rounded-[24px] border border-[#E5E7EB] bg-white px-6 py-12 text-center shadow-sm">
          <Gavel className="h-8 w-8 text-slate-400" />
          <p className="text-lg font-bold text-slate-950">No disputes yet</p>
          <p className="max-w-md text-sm font-medium text-slate-500">
            If a confirmed or completed booking has a refund or service issue,
            open the booking and use Raise a dispute.
          </p>
          <Link
            href="/bookings"
            className="mt-2 inline-flex h-11 items-center justify-center rounded-xl bg-[#2563EB] px-5 text-sm font-bold text-white"
          >
            View bookings
          </Link>
        </div>
      ) : null}

      <div className="grid gap-4">
        {(disputes ?? []).map((dispute: any) => {
          const venue = asOne(dispute.venues);
          const statusStyle =
            STATUS_STYLES[dispute.status] ?? STATUS_STYLES.open;

          return (
            <article
              key={dispute.id}
              className="rounded-[24px] border border-[#E5E7EB] bg-white p-5 shadow-sm shadow-slate-200/60"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-slate-950">
                    {venue?.name ?? "Venue"}
                  </p>
                  <p className="mt-0.5 text-xs font-bold uppercase tracking-wide text-slate-400">
                    {pretty(dispute.category)}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyle}`}
                >
                  {pretty(dispute.status)}
                </span>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm font-medium leading-6 text-slate-600">
                {dispute.reason}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
                <span>
                  Opened{" "}
                  {new Date(dispute.created_at).toLocaleString("en-PH", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
                <Link
                  href={`/bookings/${dispute.booking_id}`}
                  className="font-bold text-[#2563EB] hover:underline"
                >
                  View booking
                </Link>
              </div>

              {dispute.resolution_notes ? (
                <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB] p-4">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
                    Resolution notes
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm font-medium text-slate-700">
                    {dispute.resolution_notes}
                  </p>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
