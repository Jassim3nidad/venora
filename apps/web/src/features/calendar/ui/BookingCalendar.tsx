"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { CalendarGrid } from "./CalendarGrid";
import { DateEditorModal } from "./DateEditorModal";
import { format, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays, Loader2 } from "lucide-react";
import { useCalendar } from "../hooks/use-calendar";

export default function BookingCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [loadingVenues, setLoadingVenues] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function fetchUserVenue() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabase as any)
        .from("venues")
        .select("id")
        .eq("organization_id", user.id) // Assuming simple mapping for now
        .limit(1)
        .single();
      
      if (!error && data) {
        setVenueId(data.id);
      } else {
        // Fallback for demo if organization_id isn't directly user.id
        const { data: altData } = await (supabase as any).from("venues").select("id").limit(1).single();
        if (altData) setVenueId(altData.id);
      }
      setLoadingVenues(false);
    }
    fetchUserVenue();
  }, [supabase]);

  const { getAvailabilityForDay } = useCalendar(venueId || "", currentMonth);

  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
    setIsEditorOpen(true);
  };

  if (loadingVenues) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4" />
        <p>Loading your calendar...</p>
      </div>
    );
  }

  if (!venueId) {
    return (
      <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border">
        <CalendarDays className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p>No venues found. Please create a venue first.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 font-sans">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-2.5 rounded-xl shadow-lg shadow-blue-200">
            <CalendarDays className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {format(currentMonth, "MMMM yyyy")}
            </h1>
            <p className="text-sm text-gray-500 font-medium">Interactive Booking Calendar</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-700" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-4 py-1.5 text-sm font-bold text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap bg-white p-3 border border-gray-100 rounded-xl shadow-sm text-xs font-semibold text-gray-600 uppercase tracking-wider">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-white border border-gray-200" /> Available</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-orange-100 border border-orange-200" /> Maintenance</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-gray-200 border border-gray-300" /> Blackout</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /> Approved Booking</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /> Pending Booking</div>
        <div className="ml-auto text-blue-600">Tip: Drag and drop bookings to move them</div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4">
        <CalendarGrid venueId={venueId} currentMonth={currentMonth} onDayClick={handleDayClick} />
      </div>

      {/* Admin Editor Modal */}
      <DateEditorModal
        venueId={venueId}
        isOpen={isEditorOpen}
        date={selectedDay}
        availability={selectedDay ? getAvailabilityForDay(selectedDay) : undefined}
        onClose={() => setIsEditorOpen(false)}
      />
    </div>
  );
}
