"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MaterialIcon } from "./MaterialIcon";
import {
  DashboardPage,
  DashButton,
  DataTable,
  KpiCard,
  Panel,
  PanelHeader,
  StatusBadge,
} from "./ui";

export type VenueOwnerBooking = {
  id: string;
  eventName: string;
  eventType: string;
  client: string;
  clientInitials: string;
  date: string;
  time: string;
  revenue: string;
  status: "pending" | "approved" | "declined";
};

export type VenueOwnerOverviewProps = {
  userName: string;
  businessName?: string;
  venueCount: number;
  bookingCount: number;
  pendingCount: number;
  monthlyRevenue: number;
  avgRating: number | null;
  profileCompletion: number;
  bookings: VenueOwnerBooking[];
};

function Toast({ show, message }: { show: boolean; message: string }) {
  if (!show) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-[#111827] px-4 py-3 text-sm font-semibold text-white shadow-lg">
      <MaterialIcon name="check_circle" className="text-lg text-emerald-400" />
      {message}
    </div>
  );
}

export function VenueOwnerOverview({
  userName,
  businessName,
  venueCount,
  bookingCount,
  pendingCount,
  monthlyRevenue,
  avgRating,
  profileCompletion,
  bookings: initialBookings,
}: VenueOwnerOverviewProps) {
  const [requests, setRequests] = useState(initialBookings);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState(false);
  const supabase = createClient();

  const handleAction = async (id: string, status: "approved" | "declined") => {
    setLoadingId(id);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from("bookings")
        .update({ status })
        .eq("id", id)
        .select("id");
      if (error) throw error;

      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r)),
      );
      if (status === "approved") {
        setToast(true);
        setTimeout(() => setToast(false), 3000);
      }
    } catch {
      // keep UI responsive on failure
    } finally {
      setLoadingId(null);
    }
  };

  const kpis = [
    {
      label: "Monthly Revenue",
      value: `₱${monthlyRevenue.toLocaleString()}`,
      icon: "payments",
      highlight: true,
    },
    {
      label: "Total Bookings",
      value: String(bookingCount),
      icon: "event_available",
    },
    {
      label: "Pending Requests",
      value: String(pendingCount),
      icon: "pending_actions",
    },
    {
      label: "Avg. Rating",
      value: avgRating != null ? avgRating.toFixed(1) : "-",
      icon: "star",
    },
  ];

  return (
    <DashboardPage>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#6b7280]">
            Welcome back, {userName.split(" ")[0]}
          </p>
          <h1 className="font-display text-2xl font-bold text-[#111827] sm:text-3xl">
            {businessName ?? "Venue Dashboard"}
          </h1>
        </div>
        <DashButton href="/dashboard/bookings" icon="calendar_month">
          View All Bookings
        </DashButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Panel padding={false} className="overflow-hidden">
          <div className="border-b border-[#e5e7eb] p-5 sm:p-6">
            <PanelHeader
              title="Booking Requests"
              description="Review and respond to incoming reservation requests."
              action={
                <span className="rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-bold text-[#1d4ed8]">
                  {requests.filter((r) => r.status === "pending").length} pending
                </span>
              }
            />
          </div>
          <div className="p-5 sm:p-6">
            <DataTable
              rows={requests}
              keyFn={(r) => r.id}
              emptyMessage="No booking requests yet."
              columns={[
                {
                  key: "event",
                  header: "Event",
                  cell: (r) => (
                    <div>
                      <p className="font-semibold text-[#111827]">{r.eventName}</p>
                      <p className="text-xs text-[#6b7280]">{r.eventType}</p>
                    </div>
                  ),
                },
                {
                  key: "client",
                  header: "Client",
                  cell: (r) => (
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#eff6ff] text-xs font-bold text-[#1d4ed8]">
                        {r.clientInitials}
                      </div>
                      <span>{r.client}</span>
                    </div>
                  ),
                },
                {
                  key: "date",
                  header: "Schedule",
                  cell: (r) => (
                    <div>
                      <p>{r.date}</p>
                      <p className="text-xs text-[#6b7280]">{r.time}</p>
                    </div>
                  ),
                },
                {
                  key: "revenue",
                  header: "Revenue",
                  cell: (r) => (
                    <span className="font-semibold text-[#111827]">{r.revenue}</span>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  cell: (r) => <StatusBadge status={r.status} />,
                },
                {
                  key: "actions",
                  header: "Actions",
                  cell: (r) =>
                    r.status === "pending" ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={loadingId === r.id}
                          onClick={() => handleAction(r.id, "approved")}
                          className="rounded-lg bg-[#1d4ed8] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1e40af] disabled:opacity-50"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          disabled={loadingId === r.id}
                          onClick={() => handleAction(r.id, "declined")}
                          className="rounded-lg border border-[#e5e7eb] px-3 py-1.5 text-xs font-bold text-[#4b5563] hover:border-red-300 hover:text-red-700 disabled:opacity-50"
                        >
                          Decline
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-[#6b7280]">-</span>
                    ),
                },
              ]}
            />
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Venue Profile" />
            <div className="mb-4 flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eff6ff] text-[#1d4ed8]">
                <MaterialIcon name="location_city" className="text-3xl" />
              </div>
              <div>
                <p className="font-display font-bold text-[#111827]">
                  {venueCount} Active Venue{venueCount !== 1 ? "s" : ""}
                </p>
                <p className="text-sm text-[#4b5563]">Listed on Venora</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#4b5563]">Profile completion</span>
                <span className="font-bold text-[#1d4ed8]">{profileCompletion}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#e5e7eb]">
                <div
                  className="h-full rounded-full bg-[#1d4ed8] transition-all"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>
            </div>
            <Link
              href="/dashboard/packages"
              className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#1d4ed8] hover:underline"
            >
              Complete your profile
              <MaterialIcon name="arrow_forward" className="text-base" />
            </Link>
          </Panel>

          <Panel className="bg-[#eff6ff]/40">
            <PanelHeader
              title="Performance Trend"
              description="Confirmed bookings this year"
            />
            <div className="flex h-32 items-end gap-2">
              {[40, 55, 48, 72, 65, 88, 76, 95, 82, 100, 90, 110].map(
                (h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-md bg-[#1d4ed8]/70"
                    style={{ height: `${h * 0.9}px` }}
                  />
                ),
              )}
            </div>
          </Panel>
        </div>
      </div>

      <Toast show={toast} message="Booking accepted successfully!" />
    </DashboardPage>
  );
}
