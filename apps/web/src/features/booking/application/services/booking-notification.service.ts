/**
 * BookingNotificationService
 *
 * Application service — calls the Supabase edge function
 * for sending transactional emails/SMS.
 * Keeps notification logic out of use cases (Single Responsibility).
 */

import type { BookingStatus } from "../../domain/entities/booking.entity";

export class BookingNotificationService {
  constructor(
    private readonly supabaseUrl: string,
    private readonly anonKey: string
  ) {}

  async notify(bookingId: string, status: BookingStatus): Promise<void> {
    const res = await fetch(
      `${this.supabaseUrl}/functions/v1/booking-notifications`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.anonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ record: { id: bookingId, status } }),
      }
    );

    if (!res.ok) {
      const error = await res.json();
      console.error("[BookingNotificationService] Failed:", error);
    }
  }
}
