import Link from "next/link";
import { ChevronRight, KeyRound, UserRound } from "lucide-react";

const ACCOUNT_SETTINGS_ITEMS = [
  {
    href: "/account/personal-details",
    label: "Personal Details",
    description: "Profile picture, name, and phone number",
    icon: UserRound,
  },
  {
    href: "/account/change-password",
    label: "Change Password",
    description: "Update your account password",
    icon: KeyRound,
  },
] as const;

export default function AccountSettingsList() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-[#E5E7EB]/80 bg-white shadow-xl shadow-slate-200/60">
      <div className="border-b border-[#E5E7EB]/80 p-6 sm:p-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2563EB]">
          Account settings
        </div>

        <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">
          Personal Information
        </h2>

        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
          Choose a section below to update your profile details or change your
          password.
        </p>
      </div>

      <div className="divide-y divide-[#E5E7EB]/80">
        {ACCOUNT_SETTINGS_ITEMS.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-4 px-6 py-5 transition hover:bg-[#F9FAFB] sm:px-8"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB] transition group-hover:bg-[#2563EB] group-hover:text-white">
                <Icon className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-base font-extrabold text-slate-950">
                  {item.label}
                </p>
                <p className="mt-0.5 text-sm font-medium text-slate-500">
                  {item.description}
                </p>
              </div>

              <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:text-[#2563EB]" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
