import type { Metadata } from "next";
import { createClient } from "@/src/lib/supabase/server";
import { DashboardSubPage, Panel, PanelHeader } from "@/components/dashboard/enterprise";
import { Users, Mail, UserCheck, UserX, Clock, Plus } from "lucide-react";

export const metadata: Metadata = {
  title: "Guest & RSVP Management - Planning Suite",
};

export default async function GuestManagementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: guests } = user
    ? await supabase
        .from("event_guests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const attending = (guests || []).filter((g: any) => g.rsvp_status === "attending").length;
  const declined = (guests || []).filter((g: any) => g.rsvp_status === "declined").length;
  const pending = (guests || []).filter((g: any) => g.rsvp_status === "pending").length;

  return (
    <DashboardSubPage
      title="Guest List & RSVP Tracker"
      description="Manage your event guest list, track RSVPs, plus-ones, dietary requirements, and seating preferences."
    >
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Guests</p>
            <p className="text-lg font-bold text-slate-900">{(guests || []).length}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Attending</p>
            <p className="text-lg font-bold text-slate-900">{attending}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Pending</p>
            <p className="text-lg font-bold text-slate-900">{pending}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Declined</p>
            <p className="text-lg font-bold text-slate-900">{declined}</p>
          </div>
        </div>
      </div>

      <Panel>
        <PanelHeader
          title="Guest List"
          description="Keep track of guest groups and special requirements for seating and catering."
        />
        {(!guests || guests.length === 0) ? (
          <div className="py-12 text-center text-slate-500">
            <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-sm text-slate-700">No guests added to list yet</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Add guests to send digital RSVP invitations and collect dietary preferences.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {guests.map((g: any) => (
              <div key={g.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-slate-900">{g.first_name} {g.last_name}</p>
                  <p className="text-xs text-slate-500">{g.email || "No email"} • Group: {g.guest_group || "General"}</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 capitalize">
                  {g.rsvp_status}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </DashboardSubPage>
  );
}
