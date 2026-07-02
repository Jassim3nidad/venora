"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@venora/lib";
import { MaterialIcon } from "./MaterialIcon";
import {
  AvatarChip,
  ChartBars,
  DashButton,
  DashLink,
  DashboardPage,
  DataTable,
  IconButton,
  KpiCard,
  MiniStat,
  PageHeader,
  Panel,
  ProgressBar,
  StatusBadge,
  TableCell,
  TableRow,
  Toast,
} from "./ui";

type BookingRequest = {
  id: string;
  eventName: string;
  eventType: string;
  client: string;
  clientInitials: string;
  date: string;
  time: string;
  revenue: string;
  status: "pending" | "confirmed" | "declined";
};

const INITIAL_REQUESTS: BookingRequest[] = [
  {
    id: "1",
    eventName: "Tech Founders Mixer",
    eventType: "Evening Corporate Event",
    client: "Sarah Jenkins",
    clientInitials: "SJ",
    date: "Oct 24, 2026",
    time: "6:00 PM - 10:00 PM",
    revenue: "₱178,000",
    status: "pending",
  },
  {
    id: "2",
    eventName: "Art Exhibition Opening",
    eventType: "Public Cultural Event",
    client: "Museum of Modern Art",
    clientInitials: "MA",
    date: "Nov 02, 2026",
    time: "All Day",
    revenue: "₱305,000",
    status: "pending",
  },
  {
    id: "3",
    eventName: "Sustainable Fashion Week",
    eventType: "Runway & Showroom",
    client: "Luxe Collective",
    clientInitials: "LC",
    date: "Dec 12 - 14, 2026",
    time: "Multi-day",
    revenue: "₱665,000",
    status: "confirmed",
  },
];

const AVATAR_COLORS = ["#dae2fd", "#d3e4fe", "#ffdbd2"];

type VenueOwnerOverviewProps = {
  userName?: string;
  revenueMtd?: string;
  activeBookings?: number;
  avgRating?: string;
  profileCompletion?: number;
};

export function VenueOwnerOverview({
  userName = "Julian",
  revenueMtd = "₱1,372,000",
  activeBookings = 18,
  avgRating = "4.9",
  profileCompletion = 85,
}: VenueOwnerOverviewProps) {
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [toast, setToast] = useState(false);

  const handleAccept = (id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "confirmed" as const } : r)),
    );
    setToast(true);
    window.setTimeout(() => setToast(false), 3000);
  };

  const handleDecline = (id: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "declined" as const } : r)),
    );
  };

  return (
    <DashboardPage>
      <PageHeader
        title={`Good morning, ${userName}`}
        description="Here's what's happening across your venues today."
        actions={
          <>
            <IconButton icon="notifications" label="Notifications" />
            <DashButton>
              <MaterialIcon name="add" className="text-[18px]" />
              Create Event
            </DashButton>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Revenue (MTD)" value={revenueMtd} icon="payments" trend="12%" />
        <KpiCard
          label="Active Bookings"
          value={String(activeBookings)}
          icon="event_available"
          trend="+3 this week"
          trendMuted
        />
        <KpiCard
          label="Avg. Rating"
          value={avgRating}
          icon="star"
          suffix="/ 5.0"
          accent
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Panel padding={false} className="overflow-hidden xl:col-span-8">
          <div className="flex flex-col md:flex-row">
            <div className="relative h-52 w-full shrink-0 md:h-auto md:w-[38%]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCx4IPI2_wNHRzGQOZfBIZaaXiOMAIZUx8sGP0qq_OJ-1Gv5AcpqEWAzimOhGTOU_C626PZpA6oMiWaxHeVcHtbAuZglxt7Umo5ZnJ5spfuUxGTaom0dPHjOnTz-fUeb_QyjJRUm6-OnFymEmhoQ2cMfLO6Z9F2j3AdOjIiyTp3t1geJGyixIUBcXWYqj3Pq_ihJBp4cccn8Ccw4i6MdEqaGKwt2tNkUZvPNfqB5tYsEismEIVXIOwd4aW_DOEMoYe9o6mgJgJL3HpT"
                alt="The Glasshouse Loft"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/80">
                  Primary Venue
                </p>
                <h3 className="font-display text-xl font-semibold text-white">
                  The Glasshouse Loft
                </h3>
              </div>
            </div>
            <div className="flex flex-1 flex-col justify-center p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">Profile Completion</h3>
                <span className="font-display text-lg font-bold text-[#9a442d]">
                  {profileCompletion}%
                </span>
              </div>
              <ProgressBar value={profileCompletion} className="mb-5" />
              <ul className="space-y-2.5">
                {[
                  { done: true, text: "High-quality photos uploaded" },
                  { done: true, text: "Pricing tiers established" },
                  { done: false, text: "Add 3D Virtual Tour (Optional)" },
                ].map((item) => (
                  <li
                    key={item.text}
                    className={cn(
                      "flex items-center gap-2.5 text-sm",
                      !item.done && "opacity-50",
                    )}
                  >
                    <MaterialIcon
                      name={item.done ? "check_circle" : "radio_button_unchecked"}
                      className={cn(
                        "text-[18px]",
                        item.done ? "text-emerald-600" : "text-[#88726d]",
                      )}
                    />
                    {item.text}
                  </li>
                ))}
              </ul>
              <DashLink href="/dashboard/packages" className="mt-5 inline-flex items-center gap-1">
                Complete Profile
                <MaterialIcon name="arrow_forward" className="text-[16px]" />
              </DashLink>
            </div>
          </div>
        </Panel>

        <Panel className="relative overflow-hidden xl:col-span-4">
          <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#9a442d]/10 blur-2xl" />
          <h3 className="mb-4 font-display text-lg font-semibold">Performance Trend</h3>
          <ChartBars values={[40, 60, 45, 80, 95, 70, 55]} highlightIndex={4} />
          <p className="mb-4 text-sm leading-relaxed text-[#565e74]">
            Profile views are up <strong className="text-[#191c1e]">24%</strong> since last
            Monday. Most visitors are browsing wedding receptions.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Views" value="1,204" />
            <MiniStat label="Inquiries" value="42" />
          </div>
        </Panel>
      </div>

      <Panel padding={false}>
        <div className="flex items-center justify-between border-b border-[#f0ebe8] px-6 py-5">
          <div>
            <h3 className="font-display text-lg font-semibold">Recent Booking Requests</h3>
            <p className="mt-0.5 text-sm text-[#565e74]">Review and respond to new inquiries</p>
          </div>
          <DashLink href="/dashboard/bookings">View All</DashLink>
        </div>
        <DataTable
          columns={[
            "Event Name",
            "Guest / Client",
            "Date",
            "Revenue",
            "Status",
            "Actions",
          ]}
        >
          {requests.map((req, index) => (
            <TableRow key={req.id}>
              <TableCell>
                <p className="font-semibold">{req.eventName}</p>
                <p className="text-xs text-[#565e74]">{req.eventType}</p>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <AvatarChip
                    initials={req.clientInitials}
                    color={AVATAR_COLORS[index % AVATAR_COLORS.length]}
                  />
                  {req.client}
                </div>
              </TableCell>
              <TableCell>
                <p>{req.date}</p>
                <p className="text-xs text-[#565e74]">{req.time}</p>
              </TableCell>
              <TableCell className="font-semibold">{req.revenue}</TableCell>
              <TableCell>
                <StatusBadge status={req.status} />
              </TableCell>
              <TableCell className="text-right">
                {req.status === "pending" ? (
                  <div className="flex justify-end gap-2">
                    <DashButton
                      variant="danger"
                      className="h-8 px-3 text-xs"
                      onClick={() => handleDecline(req.id)}
                    >
                      Decline
                    </DashButton>
                    <DashButton
                      className="h-8 px-3 text-xs"
                      onClick={() => handleAccept(req.id)}
                    >
                      Accept
                    </DashButton>
                  </div>
                ) : (
                  <IconButton icon="more_vert" label="More options" className="ml-auto h-8 w-8" />
                )}
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      </Panel>

      <Toast show={toast} message="Booking accepted successfully!" />
    </DashboardPage>
  );
}
