import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Heart,
  LayoutDashboard,
  MapPin,
  ShieldCheck,
  Store,
  UserRound,
  UsersRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getFavoriteVenuesForUser } from "@/src/features/venues/application/get-favorite-venues";
import AccountForm from "./account-form";

export const metadata: Metadata = {
  title: "Personal Information",
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

  const favoriteVenues = await getFavoriteVenuesForUser(user.id);
  const favoritesPreview = favoriteVenues.slice(0, 3);

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
    <div className="space-y-8">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-[#E5E7EB]/80 bg-white p-4 shadow-sm">
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

        <div className="rounded-2xl border border-[#E5E7EB]/80 bg-white p-4 shadow-sm">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">
            Status
          </p>
          <p className="mt-1 text-xl font-black text-slate-950">Active</p>
        </div>

        <Link
          href="/favorites"
          className="rounded-2xl border border-[#E5E7EB]/80 bg-white p-4 shadow-sm transition hover:border-[#2563EB]/50 hover:bg-[#EFF6FF]"
        >
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
            <Heart className="h-4 w-4" />
          </div>
          <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-400">
            Saved
          </p>
          <p className="mt-1 text-xl font-black text-slate-950">
            {favoriteVenues.length}
          </p>
        </Link>
      </div>

      <AccountForm
        initialFullName={profile?.full_name ?? ""}
        initialPhone={profile?.phone ?? ""}
      />

      <div className="overflow-hidden rounded-[28px] border border-[#E5E7EB]/80 bg-white shadow-xl shadow-slate-200/60">
        <div className="flex flex-col gap-4 border-b border-[#E5E7EB]/80 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB] shadow-sm">
              <Heart className="h-5 w-5" />
            </div>

            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
              Saved for later
            </p>

            <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-slate-950">
              Favorite Venues
            </h2>

            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-500">
              Venues you&apos;ve saved while browsing the marketplace.
            </p>
          </div>

          {favoriteVenues.length > 0 && (
            <Link
              href="/favorites"
              className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-bold text-[#2563EB] shadow-sm transition hover:border-[#2563EB]/50 hover:bg-[#EFF6FF]"
            >
              View all ({favoriteVenues.length})
            </Link>
          )}
        </div>

        <div className="p-6 sm:p-8">
          {favoritesPreview.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {favoritesPreview.map((venue) => (
                <Link
                  key={venue.id}
                  href={`/venues/${venue.slug ?? venue.id}`}
                  className="group rounded-3xl border border-slate-200 bg-[#F9FAFB] p-4 transition hover:-translate-y-1 hover:border-[#2563EB]/50 hover:shadow-xl hover:shadow-slate-200/70"
                >
                  <div className="relative mb-4 aspect-[16/10] overflow-hidden rounded-2xl bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={venue.image}
                      alt={venue.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>

                  <h3 className="line-clamp-1 text-base font-black tracking-[-0.02em] text-slate-950 transition group-hover:text-[#1D4ED8]">
                    {venue.name}
                  </h3>

                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="line-clamp-1">{venue.location}</span>
                  </p>

                  <p className="mt-3 text-sm font-black text-slate-950">
                    {venue.price}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#E5E7EB] bg-[#F9FAFB] px-6 py-12 text-center">
              <p className="text-sm font-bold text-slate-950">
                You haven&apos;t saved any venues yet
              </p>
              <p className="mt-1.5 max-w-sm text-sm font-medium text-slate-500">
                Tap the heart icon on any venue while browsing to save it
                here for later.
              </p>
              <Link
                href="/venues"
                className="mt-5 inline-flex items-center justify-center rounded-full bg-[#2563EB] px-5 py-2.5 text-sm font-extrabold text-white shadow-sm shadow-[#2563EB]/20 transition hover:bg-[#1d4ed8]"
              >
                Browse venues
              </Link>
            </div>
          )}
        </div>
      </div>

      {visibleDashboards.length > 0 && (
        <div className="overflow-hidden rounded-[28px] border border-[#E5E7EB]/80 bg-white shadow-xl shadow-slate-200/60">
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
    </div>
  );
}
