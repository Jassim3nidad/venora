import type { BookingEntity } from "../entities/booking.entity";
import type { BookingStatus } from "../entities/booking.entity";

/**
 * Booking Repository Interface
 *
 * Pure contract — no implementation details.
 * Implemented in infrastructure/ by SupabaseBookingRepository.
 */
export interface BookingRepository {
  findById(id: string): Promise<BookingEntity | null>;
  findByCustomerId(customerId: string): Promise<BookingEntity[]>;
  findByVenueId(venueId: string): Promise<BookingEntity[]>;
  findByVenueIdAndDateRange(
    venueId: string,
    from: Date,
    to: Date
  ): Promise<BookingEntity[]>;
  save(booking: BookingEntity): Promise<void>;
  updateStatus(id: string, status: BookingStatus): Promise<void>;
  delete(id: string): Promise<void>;
}
