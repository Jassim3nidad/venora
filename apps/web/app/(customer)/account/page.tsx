import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Sparkles,
  Store,
  UserRound,
  UsersRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import AccountForm from "./account-form";

export const metadata: Metadata = {
  title: "My Account",
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = (await supabase
    .from("profiles")
    .select("full_name, avatar_url, phone")
    .eq("id", user.id)
    .single()) as any;

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  const userRoles = (roleRows ?? []).map((row: any) => row.role as string);

  const displayName = profile?.full_name || "Venora User";
  const email = user.email ?? "No email available";
  const avatarInitial =
    displayName?.charAt(0)?.toUpperCase() ||
    email?.charAt(0)?.toUpperCase() ||
    "?";

  const dashboardLinks = [
    {
      show:
        userRoles.includes("venue_owner") ||
        userRoles.includes("event_coordinator"),
      href: "/dashboard",
      label: "Venue Dashboard",
      description: "Manage venue operations and bookings.",
      icon: Store,
    },
    {
      show: userRoles.includes("supplier"),
      href: "/dashboard/supplier",
      label: "Supplier Dashboard",
      description: "Manage supplier services and inquiries.",
      icon: UsersRound,
    },
    {
      show: userRoles.includes("admin"),
      href: "/admin",
      label: "Admin Panel",
      description: "Review users, venues, reports, and system activity.",
      icon: ShieldCheck,
    },
  ];

  const visibleDashboards = dashboardLinks.filter((item) => item.show);

  return (
    <main className="min-h-screen overflow-hidden bg-[#F8FAFC] text-slate-950">
      <section className="relative border-b border-[#E5E7EB]/70 bg-[#F9FAFB]">
        <div className="absolute left-[-120px] top-[-120px] h-[320px] w-[320px] rounded-full bg-[#2563EB]/20 blur-3xl" />
        <div className="absolute right-[-140px] top-[40px] h-[300px] w-[300px] rounded-full bg-[#DBEAFE]/20 blur-3xl" />

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

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#2563EB]">
                Venora account center
              </div>

              <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-[-0.05em] text-slate-950 sm:text-5xl">
                Manage your account and security settings.
              </h1>

              <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-slate-500 sm:text-base">
                Keep your profile details updated, protect your password, and
                access the dashboards connected to your Venora role.
              </p>
            </div>

            <div className="overflow-hidden rounded-[28px] border border-[#E5E7EB]/80 bg-white shadow-xl shadow-slate-200/60">
              <div className="bg-gradient-to-br from-[#1D4ED8] via-[#2563EB] to-[#2563EB] px-6 py-7 text-white">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-white/20 bg-white/20 text-2xl font-black shadow-lg backdrop-blur-md">
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
                    <p className="truncate text-lg font-black tracking-[-0.02em]">
                      {displayName}
                    </p>
                    <p className="mt-1 truncate text-sm font-medium text-white/80">
                      {email}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-white p-5">
                <div className="rounded-2xl border border-[#E5E7EB]/80 bg-[#F9FAFB] p-4">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                    <UserRound className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">
                    Role Count
                  </p>
                  <p className="mt-1 text-xl font-black text-slate-950">
                    {userRoles.length}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#E5E7EB]/80 bg-[#F9FAFB] p-4">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">
                    Status
                  </p>
                  <p className="mt-1 text-xl font-black text-slate-950">
                    Active
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <AccountForm
          initialFullName={profile?.full_name ?? ""}
          initialPhone={profile?.phone ?? ""}
        />

        {visibleDashboards.length > 0 && (
          <div className="mt-8 overflow-hidden rounded-[28px] border border-[#E5E7EB]/80 bg-white shadow-xl shadow-slate-200/60">
            <div className="border-b border-[#E5E7EB]/80 p-6 sm:p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB] shadow-sm">
                <LayoutDashboard className="h-5 w-5" />
              </div>

              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
                Authorized access
              </p>

              <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">
                Your dashboards
              </h2>

              <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
                These dashboard shortcuts are based on the roles assigned to
                your Venora account.
              </p>
            </div>

            <div className="grid gap-4 p-6 sm:p-8 md:grid-cols-2 xl:grid-cols-3">
              {visibleDashboards.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="group rounded-3xl border border-slate-200 bg-[#F9FAFB] p-5 transition hover:-translate-y-1 hover:border-[#2563EB]/50 hover:bg-[#EFF6FF] hover:shadow-xl hover:shadow-slate-200/70"
                  >
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#2563EB] shadow-sm transition group-hover:bg-[#2563EB] group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </div>

                    <h3 className="text-base font-black tracking-[-0.02em] text-slate-950">
                      {item.label}
                    </h3>

                    <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                      {item.description}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}