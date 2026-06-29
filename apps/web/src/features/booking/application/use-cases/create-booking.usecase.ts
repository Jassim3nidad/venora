import type { BookingRepository } from "../../domain/repositories/booking-repository.interface";
import { BookingEntity } from "../../domain/entities/booking.entity";
import type { CreateBookingInput } from "../../schemas/booking.schema";

/**
 * CreateBookingUseCase
 *
 * Application layer — orchestrates domain logic + repository.
 * Does NOT know about HTTP, React, or Supabase directly.
 */
export class CreateBookingUseCase {
  constructor(private readonly bookingRepository: BookingRepository) {}

  async execute(
    input: CreateBookingInput,
    customerId: string
  ): Promise<BookingEntity> {
    const booking = BookingEntity.create({
      id: crypto.randomUUID(),
      venueId: input.venueId,
      customerId,
      packageId: input.packageId ?? null,
      eventDate: input.eventDate,
      eventTypeId: null,
      guestCount: input.guestCount,
      status: "pending",
      totalAmount: null,
      depositAmount: null,
      specialRequests: input.specialRequests ?? null,
      declineReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      confirmedAt: null,
      cancelledAt: null,
    });

    await this.bookingRepository.save(booking);
    return booking;
  }
}
