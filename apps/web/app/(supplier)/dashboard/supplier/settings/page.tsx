import type { Metadata } from "next";
import { Bell, Briefcase, Info } from "lucide-react";
import { DashboardSubPage } from "@/src/components/dashboard/enterprise";
import { getSupplierDashboardContext } from "../_lib/supplier-dashboard-data";
import { NotificationSettingsForm } from "@/src/features/notifications/ui/NotificationSettingsForm";

export const metadata: Metadata = {
  title: "Settings - Supplier Dashboard",
};
export const dynamic = "force-dynamic";

export default async function SupplierSettingsPage() {
  const { profile } = await getSupplierDashboardContext();

  return (
    <DashboardSubPage
      title="Settings"
      description="Notification preferences and your supplier role context."
    >
      <div className="grid gap-6">
        <section className="rounded-[24px] border border-[#e5e7eb] bg-white p-5 shadow-sm shadow-slate-200/60 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
              <Briefcase className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
                Role
              </p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-[#0f172a]">
                Supplier / Vendor
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#475569]">
                You offer services and packages to customers and partner with venues. You have full access to your business profile, service listings, quotes, and supplier agreements.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-[#e5e7eb] bg-white p-5 shadow-sm shadow-slate-200/60 sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
                Business
              </p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-[#0f172a]">
                {profile.business_name}
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-[#475569]">
                Your supplier business profile details are managed in the Profile tab.
              </p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[24px] border border-[#e5e7eb] bg-white shadow-sm shadow-slate-200/60">
          <div className="border-b border-[#e5e7eb] p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
                  Notifications
                </p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-[#0f172a]">
                  Delivery preferences
                </h2>
                <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#475569]">
                  Control email, push, and in-app alerts for supplier inquiries, service proposals, and booking updates.
                </p>
              </div>
            </div>
          </div>
          <div className="p-5 sm:p-6">
            <NotificationSettingsForm />
          </div>
        </section>
      </div>
    </DashboardSubPage>
  );
}
