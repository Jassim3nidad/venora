import type { Tables } from "@venora/database";
import type { BookingEntity } from "../domain/entities/booking.entity";
import type { BookingRepository } from "../domain/repositories/booking-repository.interface";
import type { BookingStatus } from "../domain/entities/booking.entity";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@venora/database";
import { BookingEntity as Booking } from "../domain/entities/booking.entity";

type BookingRow = Tables<"bookings">;

function toDomain(row: BookingRow): BookingEntity {
  return Booking.create({
    id:                row.id,
    venueId:           row.venue_id,
    customerId:        row.customer_id,
    packageId:         row.package_id,
    eventDate:         new Date(row.event_date),
    eventTypeId:       row.event_type_id,
    guestCount:        row.guest_count,
    status:            row.status,
    totalAmount:       row.total_amount ? Number(row.total_amount) : null,
    depositAmount:     row.deposit_amount ? Number(row.deposit_amount) : null,
    specialRequests:   row.special_requests,
    declineReason:     row.decline_reason,
    createdAt:         new Date(row.created_at),
    updatedAt:         new Date(row.updated_at),
    confirmedAt:       row.confirmed_at ? new Date(row.confirmed_at) : null,
    cancelledAt:       row.cancelled_at ? new Date(row.cancelled_at) : null,
  });
}

function toRow(entity: BookingEntity): Omit<BookingRow, "created_at" | "updated_at"> {
  const p = entity.toPlainObject();
  return {
    id:                p.id,
    venue_id:          p.venueId,
    customer_id:       p.customerId,
    package_id:         p.packageId,
    event_date:        p.eventDate.toISOString().split("T")[0]!,
    event_type_id:     p.eventTypeId,
    guest_count:       p.guestCount,
    status:            p.status,
    total_amount:      p.totalAmount,
    deposit_amount:    p.depositAmount,
    special_requests:  p.specialRequests,
    decline_reason:    p.declineReason,
    confirmed_at:      p.confirmedAt ? p.confirmedAt.toISOString() : null,
    cancelled_at:      p.cancelledAt ? p.cancelledAt.toISOString() : null,
  };
}

/**
 * SupabaseBookingRepository
 *
 * Implements BookingRepository using the Supabase JS client.
 * Infrastructure layer — the only place that knows about Supabase.
 */
export class SupabaseBookingRepository implements BookingRepository {
  constructor(private readonly supabase: any) {}

  async findById(id: string): Promise<BookingEntity | null> {
    const { data } = await this.supabase
      .from("bookings")
      .select("*")
      .eq("id", id)
      .single();
    return data ? toDomain(data as BookingRow) : null;
  }

  async findByCustomerId(customerId: string): Promise<BookingEntity[]> {
    const { data } = await this.supabase
      .from("bookings")
      .select("*")
      .eq("customer_id", customerId)
      .order("event_date", { ascending: false });
    return (data ?? []).map((r: any) => toDomain(r as BookingRow));
  }

  async findByVenueId(venueId: string): Promise<BookingEntity[]> {
    const { data } = await this.supabase
      .from("bookings")
      .select("*")
      .eq("venue_id", venueId)
      .order("event_date", { ascending: false });
    return (data ?? []).map((r: any) => toDomain(r as BookingRow));
  }

  async findByVenueIdAndDateRange(
    venueId: string,
    from: Date,
    to: Date
  ): Promise<BookingEntity[]> {
    const { data } = await this.supabase
      .from("bookings")
      .select("*")
      .eq("venue_id", venueId)
      .gte("event_date", from.toISOString().split("T")[0])
      .lte("event_date", to.toISOString().split("T")[0]);
    return (data ?? []).map((r: any) => toDomain(r as BookingRow));
  }

  async save(booking: BookingEntity): Promise<void> {
    const row = toRow(booking);
    const { error } = await this.supabase
      .from("bookings")
      .upsert(row, { onConflict: "id" });
    if (error) throw new Error(`[BookingRepo] save: ${error.message}`);
  }

  async updateStatus(id: string, status: BookingStatus): Promise<void> {
    const { error } = await this.supabase
      .from("bookings")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(`[BookingRepo] updateStatus: ${error.message}`);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase.from("bookings").delete().eq("id", id);
    if (error) throw new Error(`[BookingRepo] delete: ${error.message}`);
  }
}
