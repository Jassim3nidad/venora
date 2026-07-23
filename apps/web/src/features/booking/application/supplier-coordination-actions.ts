"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAuthUser } from "@/src/lib/supabase/current-user";

export async function assignSupplierToBooking(
  bookingId: string,
  supplierId: string,
  serviceDate: string | null,
  arrivalTime: string | null,
  notes: string | null,
) {
  const { supabase, user } = await getCurrentAuthUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await (supabase as any).from("booking_supplier_coordinations").insert({
    booking_id: bookingId,
    supplier_id: supplierId,
    status: "planned",
    service_date: serviceDate || null,
    arrival_time: arrivalTime || null,
    notes: notes || null,
  });

  if (error) {
    console.error("Error assigning supplier:", error);
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/coordinator/bookings/${bookingId}`);
}
