import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarCheck,
  Clock,
  CreditCard,
  HelpCircle,
  MessageCircle,
  ShieldQuestion,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Help Center" };

export const dynamic = "force-dynamic";

const HELP_TOPICS = [
  {
    label: "Bookings and reservations",
    description: "How to request, modify, or cancel a venue booking.",
    icon: CalendarCheck,
  },
  {
    label: "Payments and billing",
    description: "Understand charges, refunds, and payment methods.",
    icon: CreditCard,
  },
  {
    label: "Account and privacy",
    description: "Manage your profile, password, and data preferences.",
    icon: ShieldQuestion,
  },
  {
    label: "Chat with support",
    description: "Message our team directly for anything else.",
    icon: MessageCircle,
  },
];

function ComingSoonBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-slate-400">
      <Clock className="h-3 w-3" />
      Coming soon
    </span>
  );
}

export default async function HelpCenterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/help");

  return (
    <main className="min-h-screen bg-[#F9FAFB]">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/venues"
            className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-bold text-[#6B7280] shadow-sm transition hover:border-[#2563EB]/50 hover:bg-[#EFF6FF] hover:text-[#2563EB]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Venues
          </Link>
        </div>

        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-[-0.03em] text-slate-950">
              Help Center
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              A full support center is on the way.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-[#E5E7EB]/80 bg-white shadow-xl shadow-slate-200/60">
          <div className="border-b border-[#E5E7EB]/80 p-6 sm:p-8">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
              Support
            </p>
            <h2 className="mt-1 text-xl font-black tracking-[-0.03em] text-slate-950">
              Help topics
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
              We&apos;re putting together guides and live support. Here&apos;s
              what you&apos;ll be able to find here.
            </p>
          </div>

          <div className="divide-y divide-[#E5E7EB]/80">
            {HELP_TOPICS.map((row) => {
              const Icon = row.icon;

              return (
                <div
                  key={row.label}
                  className="flex items-start justify-between gap-4 p-6 sm:p-8"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F9FAFB] text-[#2563EB]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-950">
                        {row.label}
                      </h3>
                      <p className="mt-1 max-w-xl text-sm font-medium leading-6 text-slate-500">
                        {row.description}
                      </p>
                    </div>
                  </div>

                  <ComingSoonBadge />
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-[#E5E7EB]/80 bg-white p-5 shadow-sm">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">
                Need help right now?
              </h3>
              <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                Email us at{" "}
                <a
                  href="mailto:support@venora.com"
                  className="font-bold text-[#2563EB] hover:underline"
                >
                  support@venora.com
                </a>{" "}
                and we&apos;ll get back to you as soon as we can.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
