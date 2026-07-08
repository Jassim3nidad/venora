import type { BookingRepository } from "../../domain/repositories/booking-repository.interface";
import { BookingEntity } from "../../domain/entities/booking.entity";
import type { CreateBookingInput } from "../../schemas/booking.schema";
import { isTodayOrFutureDateString, PAST_DATE_MESSAGE } from "@/src/lib/date-only";

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
    if (!isTodayOrFutureDateString(input.eventDate)) {
      throw new Error(PAST_DATE_MESSAGE);
    }

    const booking = BookingEntity.create({
      id: crypto.randomUUID(),
      venueId: input.venueId,
      customerId,
      packageId: input.packageId ?? null,
      eventDate: new Date(`${input.eventDate}T00:00:00`),
      eventStartTime: input.eventStartTime || null,
      eventEndTime: input.eventEndTime || null,
      eventTypeId: null,
      guestCount: input.guestCount,
      status: "pending",
      totalAmount: null,
      depositAmount: null,
      specialRequests: input.specialRequests ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      approvedAt: null,
      paymentDueAt: null,
      paymentStartedAt: null,
      paidAt: null,
      confirmedAt: null,
      cancelledAt: null,
      completedAt: null,
      reviewedAt: null,
    });

    await this.bookingRepository.save(booking);
    return booking;
  }
}
