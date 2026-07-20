import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Settings as SettingsIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NotificationSettingsForm } from "@/features/notifications/ui/NotificationSettingsForm";

export const metadata: Metadata = { title: "Notification Settings" };

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/settings");

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
            <SettingsIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-[-0.03em] text-slate-950">
              Notification settings
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Control email, push, in-app, booking, payment, review, and admin
              alert delivery.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-[#E5E7EB]/80 bg-white shadow-xl shadow-slate-200/60">
          <div className="border-b border-[#E5E7EB]/80 p-6 sm:p-8">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
              Notifications
            </p>
            <h2 className="mt-1 text-xl font-bold tracking-[-0.03em] text-slate-950">
              Delivery preferences
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
              These preferences apply to customer, venue-owner, supplier,
              coordinator, and admin notification flows.
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <NotificationSettingsForm />
          </div>
        </div>
      </div>
    </main>
  );
}
