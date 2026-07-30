import type { Metadata } from "next";
import { Bell, Bot, Briefcase, Building2 } from "lucide-react";
import { DashboardSubPage } from "@/src/components/dashboard/enterprise";
import {
  getOwnerDashboardContext,
  getOwnerVenueIds,
} from "@/src/lib/dashboard/org-dashboard-data";
import { NotificationSettingsForm } from "@/src/features/notifications/ui/NotificationSettingsForm";
import {
  type AutoAcceptSettingsState,
  type VenueOption,
  VenueAutoAcceptSettingsForm,
} from "@/src/features/booking/ui/VenueAutoAcceptSettingsForm";

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

  const [{ data: venues }, { data: autoAcceptRows }, { data: eventTypeRows }] =
    await Promise.all([
      isAdmin || venueIds.length > 0
        ? venuesQuery
        : Promise.resolve({ data: [] }),
      (supabase as any)
        .from("venue_auto_accept_settings")
        .select("*")
        .in(
          "venue_id",
          venueIds.length > 0
            ? venueIds
            : ["00000000-0000-0000-0000-000000000000"],
        ),
      (supabase as any).from("event_types").select("id, name").order("name"),
    ]);

  const settingsByVenue = new Map(
    ((autoAcceptRows ?? []) as any[]).map((row) => [row.venue_id, row]),
  );

  const defaultSettings: AutoAcceptSettingsState = {
    enabled: false,
    minimumNoticeHours: 48,
    maximumGuestCount: "",
    allowedWeekdays: [0, 1, 2, 3, 4, 5, 6],
    allowedStartTime: "",
    allowedEndTime: "",
    minimumDurationMinutes: "",
    maximumDurationMinutes: "",
    minimumBookingAmount: "",
    requireStandardPackage: true,
    requireDeposit: true,
    requireVerifiedCustomer: true,
    allowedEventTypeIds: null,
    confidenceThreshold: 0.85,
    reviewWindowMinutes: 30,
  };

  const assignedVenues: VenueOption[] = (
    (venues ?? []) as Array<{
      id: string;
      name: string;
      city: string | null;
      province: string | null;
    }>
  ).map((venue) => {
    const row = settingsByVenue.get(venue.id) as any;
    return {
      id: venue.id,
      name: venue.name,
      location: [venue.city, venue.province].filter(Boolean).join(", "),
      settings: row
        ? {
            enabled: row.enabled,
            minimumNoticeHours: row.minimum_notice_hours,
            maximumGuestCount: row.maximum_guest_count ?? "",
            allowedWeekdays: row.allowed_weekdays,
            allowedStartTime: row.allowed_start_time?.slice(0, 5) ?? "",
            allowedEndTime: row.allowed_end_time?.slice(0, 5) ?? "",
            minimumDurationMinutes: row.minimum_duration_minutes ?? "",
            maximumDurationMinutes: row.maximum_duration_minutes ?? "",
            minimumBookingAmount:
              row.minimum_booking_amount == null
                ? ""
                : Number(row.minimum_booking_amount),
            requireStandardPackage: row.require_standard_package,
            requireDeposit: row.require_deposit,
            requireVerifiedCustomer: row.require_verified_customer,
            allowedEventTypeIds: row.allowed_event_type_ids,
            confidenceThreshold: Number(row.confidence_threshold),
            reviewWindowMinutes: row.review_window_minutes,
          }
        : { ...defaultSettings },
    };
  });

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
              <h2 className="mt-1 text-xl font-black tracking-tight text-[#0f172a]">
                Venue Owner
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#475569]">
                You own and manage venue spaces. You have full access to venue
                settings, staff management, and all bookings for your venues.
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
              <h2 className="mt-1 text-xl font-black tracking-tight text-[#0f172a]">
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
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#2563EB]">
                  Smart booking automation
                </p>
                <h2 className="mt-1 text-xl font-black tracking-tight text-[#0f172a]">
                  Auto-accept rules
                </h2>
                <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-[#475569]">
                  Configure deterministic eligibility per venue. AI interprets
                  notes but cannot override availability, capacity, pricing,
                  payment, or security checks.
                </p>
              </div>
            </div>
          </div>
          <div className="p-5 sm:p-6">
            <VenueAutoAcceptSettingsForm
              venues={assignedVenues}
              eventTypes={((eventTypeRows ?? []) as any[]).map((row) => ({
                id: row.id,
                name: row.name,
              }))}
            />
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
                  Control email, push, and in-app alerts for booking updates,
                  venue inquiries, and marketplace activity.
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
