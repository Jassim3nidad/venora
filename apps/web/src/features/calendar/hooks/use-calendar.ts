"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { queryKeys } from "@/lib/query-keys";
import { format, startOfMonth, endOfMonth, parseISO, isSameDay } from "date-fns";
import { BookingStatusValue, AvailabilityStatusValue } from "../types/calendar.types";

export interface Booking {
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

export interface VenueAvailability {
  id: string;
  venue_id: string;
  date: string;
  status: AvailabilityStatusValue;
  seasonal_price_override: number | null;
  note: string | null;
}

export function useCalendar(venueId: string, currentMonth: Date) {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const monthStr = format(currentMonth, "yyyy-MM");

  // Format bounds for the queries
  const startDate = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const endDate = format(endOfMonth(currentMonth), "yyyy-MM-dd");

  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: queryKeys.calendar.bookings(venueId, monthStr),
    queryFn: async () => {
      if (!venueId) return [];
      const { data, error } = await (supabase as any)
        .from("bookings")
        .select(`
          id, event_date, status, guest_count, total_amount, deposit_amount,
          special_requests, decline_reason, created_at,
          venue:venues!bookings_venue_id_fkey(id, name),
          customer:profiles!bookings_customer_id_fkey(id, full_name, email, phone),
          package:venue_packages!bookings_package_id_fkey(id, name, price)
        `)
        .eq("venue_id", venueId)
        .gte("event_date", startDate)
        .lte("event_date", endDate)
        .order("event_date", { ascending: true });
        
      if (error) throw error;
      return (data as unknown as Booking[]) || [];
    },
    enabled: !!venueId,
  });

  const { data: availability = [], isLoading: loadingAvailability } = useQuery({
    queryKey: queryKeys.calendar.availability(venueId, monthStr),
    queryFn: async () => {
      if (!venueId) return [];
      const { data, error } = await (supabase as any)
        .from("venue_availability")
        .select(`*`)
        .eq("venue_id", venueId)
        .gte("date", startDate)
        .lte("date", endDate);
        
      if (error) throw error;
      return (data as VenueAvailability[]) || [];
    },
    enabled: !!venueId,
  });

  // Setup Realtime listeners
  useEffect(() => {
    if (!venueId) return;

    const channel = supabase.channel(`calendar-updates-${venueId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `venue_id=eq.${venueId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.calendar.bookings(venueId, monthStr) });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "venue_availability", filter: `venue_id=eq.${venueId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.calendar.availability(venueId, monthStr) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [venueId, monthStr, supabase, queryClient]);

  // Helper functions
  const getBookingsForDay = (day: Date) => 
    bookings.filter((b) => isSameDay(parseISO(b.event_date), day));
    
  const getAvailabilityForDay = (day: Date) =>
    availability.find((a) => isSameDay(parseISO(a.date), day));

  return {
    bookings,
    availability,
    isLoading: loadingBookings || loadingAvailability,
    getBookingsForDay,
    getAvailabilityForDay,
  };
}
