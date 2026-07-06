import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AccountNav from "./_components/AccountNav";

export const metadata: Metadata = {
  title: {
    template: "%s | Account Center",
    default: "Account Center",
  },
};

export const dynamic = "force-dynamic";

export default async function AccountLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = (await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single()) as any;

  const displayName = profile?.full_name || "Venora User";
  const email = user.email ?? "No email available";
  const avatarInitial =
    displayName?.charAt(0)?.toUpperCase() ||
    email?.charAt(0)?.toUpperCase() ||
    "?";

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-950">
      <section className="relative border-b border-[#E5E7EB]/70 bg-[#F9FAFB]">
        <div className="absolute left-[-120px] top-[-120px] -z-10 h-[320px] w-[320px] rounded-full bg-[#2563EB]/20 blur-3xl" />
        <div className="absolute right-[-140px] top-[40px] -z-10 h-[300px] w-[300px] rounded-full bg-[#DBEAFE]/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/venues"
              className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-bold text-[#6B7280] shadow-sm transition hover:border-[#2563EB]/50 hover:bg-[#EFF6FF] hover:text-[#2563EB]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Venues
            </Link>

            <Link
              href="/logout"
              className="inline-flex w-fit items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 shadow-sm transition hover:border-red-300 hover:bg-red-100"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Link>
          </div>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2563EB]">
                Venora account center
              </div>

              <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-[-0.05em] text-slate-950 sm:text-5xl">
                Account Center
              </h1>

              <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-slate-500 sm:text-base">
                Manage your personal information, payments, transaction
                history, and privacy preferences in one place.
              </p>
            </div>

            <div className="flex w-fit items-center gap-3 rounded-2xl border border-[#E5E7EB]/80 bg-white p-3 pr-5 shadow-sm">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#EFF6FF] text-base font-black text-[#2563EB]">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  avatarInitial
                )}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-black tracking-[-0.02em] text-slate-950">
                  {displayName}
                </p>
                <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                  {email}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
          <AccountNav />
          <div className="min-w-0">{children}</div>
        </div>
      </section>
    </main>
  );
}
