"use server";

import { createClient } from "@/src/lib/supabase/server";

export async function getSupplierInquiryMessages(inquiryId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("supplier_inquiry_messages")
    .select("id, inquiry_id, sender_id, message, created_at")
    .eq("inquiry_id", inquiryId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((msg: any) => ({
    id: msg.id,
    booking_id: msg.inquiry_id,
    sender_id: msg.sender_id,
    sender_role: msg.sender_id === user.id ? "customer" : "venue_owner", // "venue_owner" maps to partner visually
    message: msg.message,
    created_at: msg.created_at,
    sender_name: null,
  }));
}
