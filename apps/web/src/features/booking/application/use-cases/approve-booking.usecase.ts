import type { BookingRepository } from "../../domain/repositories/booking-repository.interface";
import { BookingEntity } from "../../domain/entities/booking.entity";

/**
 * ApproveBookingUseCase
 *
 * Approves a pending booking, calculating/finalising totals.
 * Validates the transition and records totals.
 */
export class ApproveBookingUseCase {
  constructor(private readonly bookingRepository: BookingRepository) {}

  async execute(
    bookingId: string,
    totalAmount: number,
    depositAmount: number
  ): Promise<BookingEntity> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) throw new Error(`Booking ${bookingId} not found`);

    const approved = booking.approve(totalAmount, depositAmount);
    await this.bookingRepository.save(approved);
    return approved;
  }
}
