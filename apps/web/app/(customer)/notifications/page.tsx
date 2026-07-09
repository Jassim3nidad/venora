import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Bell, Settings } from "lucide-react";
import {
  CustomerLinkButton,
  CustomerPageHeader,
} from "@/components/customer/CustomerUI";
import { createClient } from "@/lib/supabase/server";
import { NotificationCenter } from "@/features/notifications/ui/NotificationCenter";

export const metadata: Metadata = {
  title: "Notifications | Venora",
};

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectTo=/notifications");

  return (
    <div className="bg-[#F8FAFC] text-[#111827]">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <Link
          href="/venues"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-bold text-[#6B7280] shadow-sm transition hover:border-[#2563EB]/50 hover:bg-[#EFF6FF] hover:text-[#2563EB]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Venues
        </Link>

        <CustomerPageHeader
          eyebrow="Realtime center"
          icon={Bell}
          title="Notifications"
          description="Booking updates, payment changes, review requests, admin alerts, and delivery status in one place."
          action={
            <CustomerLinkButton href="/settings" tone="secondary">
              <Settings className="h-4 w-4" />
              Preferences
            </CustomerLinkButton>
          }
        />

        <NotificationCenter />
      </div>
    </div>
  );
}
