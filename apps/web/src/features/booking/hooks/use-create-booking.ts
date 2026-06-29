"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/src/lib/supabase/client";
import { SupabaseBookingRepository } from "../infrastructure/supabase-booking.repository";
import { CreateBookingUseCase } from "../application/use-cases/create-booking.usecase";
import type { CreateBookingInput } from "../schemas/booking.schema";
import type { BookingEntity } from "../domain/entities/booking.entity";
import { queryKeys } from "@/src/lib/query-keys";

/**
 * useCreateBooking — TanStack Query mutation for creating a booking.
 */
export function useCreateBooking(customerId: string) {
  const queryClient = useQueryClient();

  return useMutation<BookingEntity, Error, CreateBookingInput>({
    mutationFn: async (input) => {
      const supabase = createClient() as any;
      const repo = new SupabaseBookingRepository(supabase);
      const useCase = new CreateBookingUseCase(repo);
      return useCase.execute(input, customerId);
    },
    onSuccess: (booking) => {
      // Invalidate the customer's booking list using centralized query keys
      void queryClient.invalidateQueries({
        queryKey: queryKeys.bookings.byCustomer(customerId),
      });
      // Invalidate the venue's booking list
      void queryClient.invalidateQueries({
        queryKey: queryKeys.bookings.byVenue(booking.venueId),
      });
    },
    onError: (error) => {
      console.error("[useCreateBooking] Error:", error);
    },
  });
}
