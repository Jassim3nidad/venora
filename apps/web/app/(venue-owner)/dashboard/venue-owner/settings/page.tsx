import type { Metadata } from "next";
import { Bell, Briefcase, Building2 } from "lucide-react";
import { DashboardSubPage } from "@/src/components/dashboard/enterprise";
import {
  getOwnerDashboardContext,
  getOwnerVenueIds,
} from "@/src/lib/dashboard/org-dashboard-data";
import { NotificationSettingsForm } from "@/src/features/notifications/ui/NotificationSettingsForm";

export const metadata: Metadata = {
  title: "Settings - Venue Owner Dashboard",
};
export const dynamic = "force-dynamic";

export default async function VenueOwnerSettingsPage() {
  const context = await getOwnerDashboardContext();
  const { supabase, isAdmin } = context;
  const venueIds = await getOwnerVenueIds(context);

  let venuesQuery = supabase.from("venues").select("id, name, city, province");
  if (!isAdmin) venuesQuery = venuesQuery.in("id", venueIds);

  const { data: venues } =
    isAdmin || venueIds.length > 0 ? await venuesQuery : { data: [] };

  const assignedVenues = (
    (venues ?? []) as Array<{
      id: string;
      name: string;
      city: string | null;
      province: string | null;
    }>
  ).map((venue) => ({
    id: venue.id,
    name: venue.name,
    location: [venue.city, venue.province].filter(Boolean).join(", "),
  }));

  return (
    <DashboardSubPage
      title="Settings"
      description="Notification preferences and your venue owner role context."
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
              <h2 className="mt-1 text-xl font-bold tracking-tight text-[#0f172a]">
                Venue Owner
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#475569]">
                You own and manage venue spaces. You have full access to venue settings, staff management, and all bookings for your venues.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[24px] border border-[#e5e7eb] bg-white p-5 shadow-sm shadow-slate-200/60 sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
                Properties
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-[#0f172a]">
                Your venues
              </h2>
              <p className="mt-2 text-sm font-medium leading-6 text-[#475569]">
                Venues managed by your organization.
              </p>
            </div>
          </div>

          {assignedVenues.length === 0 ? (
            <p className="rounded-2xl border border-[#e5e7eb] bg-[#f8fbff] px-4 py-3 text-sm font-medium text-[#475569]">
              You have not created any venues yet.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {assignedVenues.map((venue) => (
                <li
                  key={venue.id}
                  className="rounded-2xl border border-[#e5e7eb] bg-[#f8fbff] px-4 py-3"
                >
                  <p className="text-sm font-extrabold text-[#0f172a]">
                    {venue.name}
                  </p>
                  {venue.location ? (
                    <p className="mt-1 text-xs font-medium text-[#64748b]">
                      {venue.location}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
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
                <h2 className="mt-1 text-xl font-bold tracking-tight text-[#0f172a]">
                  Delivery preferences
                </h2>
                <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#475569]">
                  Control email, push, and in-app alerts for booking updates, venue inquiries, and marketplace activity.
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
