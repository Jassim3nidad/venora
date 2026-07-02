"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays, X, CheckCircle, XCircle, Loader2, Users, Building2, Package, DollarSign, MessageSquare, Clock } from "lucide-react";

interface Booking {
  id: string;
  event_date: string;
  status: BookingStatusValue;
  guest_count: number;
  total_amount: number | null;
  deposit_amount: number | null;
  special_requests: string | null;
  decline_reason: string | null;
  created_at: string;
  venue: {
    id: string;
    name: string;
  };
  customer: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
  };
  package: {
    id: string;
    name: string;
    price: number;
  } | null;
}

type BookingStatusValue = "pending" | "approved" | "declined" | "cancelled" | "completed" | "expired";

const STATUS_CONFIG: Record<BookingStatusValue, { label: string; bg: string; color: string; dot: string }> = {
  pending:   { label: "Pending",   bg: "#FFF3CD", color: "#B45309", dot: "#F59E0B" },
  approved:  { label: "Approved",  bg: "#D1FAE5", color: "#065F46", dot: "#10B981" },
  declined:  { label: "Declined",  bg: "#FEE2E2", color: "#991B1B", dot: "#EF4444" },
  cancelled: { label: "Cancelled", bg: "#F3F4F6", color: "#374151", dot: "#9CA3AF" },
  completed: { label: "Completed", bg: "#E0E7FF", color: "#3730A3", dot: "#6366F1" },
  expired:   { label: "Expired",   bg: "#F3F4F6", color: "#6B7280", dot: "#9CA3AF" },
};

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function BookingCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: fetchError } = await supabase
        .from("bookings")
        .select(`
          id,
          event_date,
          status,
          guest_count,
          total_amount,
          deposit_amount,
          special_requests,
          decline_reason,
          created_at,
          venue:venues!bookings_venue_id_fkey(id, name),
          customer:profiles!bookings_customer_id_fkey(id, full_name, email, phone),
          package:venue_packages!bookings_package_id_fkey(id, name, price)
        `)
        .order("event_date", { ascending: true });

      if (fetchError) throw fetchError;
      setBookings((data as unknown as Booking[]) ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load bookings";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth)),
    end: endOfWeek(endOfMonth(currentMonth)),
  });

  const getBookingsForDay = (day: Date) =>
    bookings.filter((b) => isSameDay(parseISO(b.event_date), day));

  const selectedBookings = selectedDay ? getBookingsForDay(selectedDay) : [];

  const updateBookingStatus = async (bookingId: string, status: "approved" | "declined") => {
    setActionLoading(bookingId + status);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from("bookings")
        .update({ status })
        .eq("id", bookingId);
      if (updateError) throw updateError;
      await fetchBookings();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Update failed";
      setError(message);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div style={{ display: "flex", gap: "1.5rem", minHeight: "70vh", fontFamily: "var(--font-sora, 'Inter', sans-serif)" }}>
      {/* ─── Left: Calendar ─── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ background: "linear-gradient(135deg, #E07A5F 0%, #C4614A 100%)", borderRadius: "0.6rem", padding: "0.5rem", display: "flex" }}>
              <CalendarDays size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1A0A00", margin: 0 }}>
                {format(currentMonth, "MMMM yyyy")}
              </h1>
              <p style={{ fontSize: "0.8rem", color: "#9CA3AF", margin: 0 }}>Booking Calendar</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <button
              onClick={() => setCurrentMonth(new Date())}
              style={{ padding: "0.4rem 0.9rem", borderRadius: "0.5rem", border: "1px solid #E2E8F0", background: "#fff", fontSize: "0.8rem", fontWeight: 600, color: "#374151", cursor: "pointer" }}
            >
              Today
            </button>
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              style={{ padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              <ChevronLeft size={16} color="#374151" />
            </button>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              style={{ padding: "0.5rem", borderRadius: "0.5rem", border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center" }}
            >
              <ChevronRight size={16} color="#374151" />
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div style={{ background: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: "0.5rem", padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: "0.85rem", color: "#991B1B" }}>
            {error}
          </div>
        )}

        {/* Legend */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.dot }} />
              <span style={{ fontSize: "0.75rem", color: "#6B7280", fontWeight: 500 }}>{cfg.label}</span>
            </div>
          ))}
        </div>

        {/* Day-of-week headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", marginBottom: "2px" }}>
          {DAYS_OF_WEEK.map((d) => (
            <div key={d} style={{ textAlign: "center", padding: "0.5rem 0", fontSize: "0.7rem", fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        {loading ? (
          <div style={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", color: "#9CA3AF" }}>
            <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
            <span>Loading bookings…</span>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
            {calendarDays.map((day) => {
              const dayBookings = getBookingsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const isTodayDate = isToday(day);

              return (
                <div
                  key={day.toString()}
                  onClick={() => setSelectedDay(isSameDay(day, selectedDay ?? new Date(0)) ? null : day)}
                  style={{
                    minHeight: "90px",
                    padding: "0.4rem",
                    borderRadius: "0.5rem",
                    border: isSelected
                      ? "2px solid #E07A5F"
                      : "1px solid #F3F4F6",
                    background: isSelected
                      ? "#FFF5F2"
                      : isCurrentMonth ? "#fff" : "#F9FAFB",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    opacity: isCurrentMonth ? 1 : 0.4,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Date number */}
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "50%",
                      fontSize: "0.75rem",
                      fontWeight: isTodayDate ? 800 : 600,
                      background: isTodayDate ? "#E07A5F" : "transparent",
                      color: isTodayDate ? "#fff" : isCurrentMonth ? "#374151" : "#9CA3AF",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {format(day, "d")}
                  </div>

                  {/* Booking pills */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    {dayBookings.slice(0, 3).map((b) => {
                      const cfg = STATUS_CONFIG[b.status] ?? STATUS_CONFIG.pending;
                      return (
                        <div
                          key={b.id}
                          style={{
                            background: cfg.bg,
                            color: cfg.color,
                            borderRadius: "3px",
                            padding: "1px 4px",
                            fontSize: "0.6rem",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            display: "flex",
                            alignItems: "center",
                            gap: "3px",
                          }}
                        >
                          <div style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
                          {b.venue?.name ?? "Booking"}
                        </div>
                      );
                    })}
                    {dayBookings.length > 3 && (
                      <div style={{ fontSize: "0.6rem", color: "#9CA3AF", paddingLeft: "2px" }}>
                        +{dayBookings.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Right: Details Sidebar ─── */}
      <div
        style={{
          width: selectedDay ? 340 : 0,
          overflow: "hidden",
          transition: "width 0.25s ease",
          flexShrink: 0,
        }}
      >
        {selectedDay && (
          <div
            style={{
              width: 340,
              border: "1px solid #E5E7EB",
              borderRadius: "1rem",
              background: "#fff",
              padding: "1.25rem",
              height: "100%",
              overflowY: "auto",
              boxShadow: "0 4px 24px -8px rgba(0,0,0,0.08)",
            }}
          >
            {/* Sidebar Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: "1rem", color: "#1A0A00" }}>
                  {format(selectedDay, "EEEE, MMMM d")}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#9CA3AF" }}>
                  {selectedBookings.length} booking{selectedBookings.length !== 1 ? "s" : ""}
                </div>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                style={{ padding: "0.3rem", borderRadius: "0.4rem", border: "1px solid #E5E7EB", background: "transparent", cursor: "pointer", display: "flex" }}
              >
                <X size={14} color="#6B7280" />
              </button>
            </div>

            {/* Booking List */}
            {selectedBookings.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem 0", color: "#9CA3AF" }}>
                <CalendarDays size={32} style={{ margin: "0 auto 0.5rem" }} />
                <p style={{ fontSize: "0.85rem" }}>No bookings on this day</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {selectedBookings.map((booking) => {
                  const cfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.pending;
                  const approveKey = booking.id + "confirmed";
                  const cancelKey = booking.id + "cancelled";

                  return (
                    <div
                      key={booking.id}
                      style={{
                        border: "1px solid #F3F4F6",
                        borderRadius: "0.75rem",
                        padding: "1rem",
                        background: "#FAFAFA",
                      }}
                    >
                      {/* Status badge */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                        <div
                          style={{
                            background: cfg.bg,
                            color: cfg.color,
                            borderRadius: "1rem",
                            padding: "0.2rem 0.6rem",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            gap: "0.3rem",
                          }}
                        >
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot }} />
                          {cfg.label}
                        </div>
                      </div>

                      {/* Booking info rows */}
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.8rem", color: "#374151" }}>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <Building2 size={13} color="#E07A5F" />
                          <span style={{ fontWeight: 700 }}>{booking.venue?.name ?? "N/A"}</span>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <Users size={13} color="#6366F1" />
                          <span style={{ fontWeight: 600 }}>{booking.customer?.full_name ?? "Unknown"}</span>
                          <span style={{ color: "#9CA3AF" }}>{booking.customer?.email}</span>
                        </div>
                        {booking.customer?.phone && (
                          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                            <span style={{ color: "#9CA3AF", fontSize: "0.75rem" }}>📞 {booking.customer.phone}</span>
                          </div>
                        )}
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <Users size={13} color="#9CA3AF" />
                          <span>{booking.guest_count} guests</span>
                        </div>
                        {booking.package && (
                          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                            <Package size={13} color="#10B981" />
                            <span>{booking.package.name}</span>
                          </div>
                        )}
                        {booking.total_amount && (
                          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                            <DollarSign size={13} color="#10B981" />
                            <span style={{ fontWeight: 700, color: "#065F46" }}>
                              ₱{booking.total_amount.toLocaleString()}
                            </span>
                            {booking.deposit_amount && (
                              <span style={{ color: "#9CA3AF" }}>· Deposit: ₱{booking.deposit_amount.toLocaleString()}</span>
                            )}
                          </div>
                        )}
                        {booking.special_requests && (
                          <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", background: "#F9FAFB", borderRadius: "0.4rem", padding: "0.4rem 0.5rem" }}>
                            <MessageSquare size={13} color="#9CA3AF" style={{ marginTop: 1, flexShrink: 0 }} />
                            <span style={{ fontSize: "0.75rem", color: "#6B7280", fontStyle: "italic" }}>"{booking.special_requests}"</span>
                          </div>
                        )}
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", color: "#9CA3AF", fontSize: "0.72rem" }}>
                          <Clock size={11} />
                          <span>Requested {format(parseISO(booking.created_at), "MMM d, yyyy")}</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {booking.status === "pending" && (
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                          <button
                            onClick={() => updateBookingStatus(booking.id, "approved")}
                            disabled={actionLoading !== null}
                            style={{
                              flex: 1,
                              height: "2rem",
                              borderRadius: "0.4rem",
                              background: "#D1FAE5",
                              color: "#065F46",
                              border: "1px solid #A7F3D0",
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              cursor: actionLoading !== null ? "not-allowed" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "0.25rem",
                              opacity: actionLoading !== null ? 0.6 : 1,
                            }}
                          >
                            {actionLoading === booking.id + "approved" ? (
                              <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                            ) : (
                              <CheckCircle size={12} />
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => updateBookingStatus(booking.id, "declined")}
                            disabled={actionLoading !== null}
                            style={{
                              flex: 1,
                              height: "2rem",
                              borderRadius: "0.4rem",
                              background: "#FEE2E2",
                              color: "#991B1B",
                              border: "1px solid #FCA5A5",
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              cursor: actionLoading !== null ? "not-allowed" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "0.25rem",
                              opacity: actionLoading !== null ? 0.6 : 1,
                            }}
                          >
                            {actionLoading === booking.id + "declined" ? (
                              <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                            ) : (
                              <XCircle size={12} />
                            )}
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CSS for spinner */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
