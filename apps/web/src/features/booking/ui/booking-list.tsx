"use client";

import type { BookingEntity } from "../domain/entities/booking.entity";
import { BookingStatusBadge } from "./booking-status-badge";
import type { BookingStatusValue } from "../domain/value-objects/booking-status.vo";

interface BookingListProps {
  bookings: BookingEntity[];
  emptyMessage?: string;
}

export function BookingList({
  bookings,
  emptyMessage = "No bookings found.",
}: BookingListProps) {
  if (bookings.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📋</div>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul
      id="booking-list"
      role="list"
      style={{ display: "flex", flexDirection: "column", gap: "0.75rem", listStyle: "none" }}
    >
      {bookings.map((booking) => (
        <li
          key={booking.id}
          id={`booking-item-${booking.id}`}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "1.25rem 1.5rem",
            borderRadius: "0.875rem",
            border: "1px solid var(--border-default)",
            background: "var(--bg-subtle)",
          }}
        >
          <div>
            <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
              {booking.eventDate.toLocaleDateString("en-PH", { dateStyle: "long" })}
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
              {booking.guestCount} guests
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700 }}>
                {booking.totalAmount !== null ? `₱${booking.totalAmount.toLocaleString()}` : "Pending Quote"}
              </div>
              {booking.depositAmount !== null && (
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Deposit: ₱{booking.depositAmount.toLocaleString()}
                </div>
              )}
            </div>
            <BookingStatusBadge status={booking.status as BookingStatusValue} />
          </div>
        </li>
      ))}
    </ul>
  );
}
