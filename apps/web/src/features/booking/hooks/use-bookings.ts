"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/src/lib/supabase/client";
import { SupabaseBookingRepository } from "../infrastructure/supabase-booking.repository";
import type { BookingEntity } from "../domain/entities/booking.entity";
import { queryKeys } from "@/src/lib/query-keys";

/**
 * useBookings — TanStack Query hook for fetching a customer's bookings.
 */
export function useBookings(customerId: string | undefined) {
  return useQuery<BookingEntity[]>({
    queryKey: queryKeys.bookings.byCustomer(customerId ?? ""),
    queryFn: async () => {
      if (!customerId) return [];
      const supabase = createClient() as any;
      const repo = new SupabaseBookingRepository(supabase);
      return repo.findByCustomerId(customerId);
    },
    enabled: !!customerId,
    staleTime: 30_000,
  });
}

/**
 * useVenueBookings — bookings for a specific venue (venue owner use case).
 */
export function useVenueBookings(venueId: string | undefined) {
  return useQuery<BookingEntity[]>({
    queryKey: queryKeys.bookings.byVenue(venueId ?? ""),
    queryFn: async () => {
      if (!venueId) return [];
      const supabase = createClient() as any;
      const repo = new SupabaseBookingRepository(supabase);
      return repo.findByVenueId(venueId);
    },
    enabled: !!venueId,
  });
}
