"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type PartnershipMessage = {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
  venue_organization_id: string;
  supplier_id: string;
  sender: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

export async function getPartnershipMessages(
  venueOrgId: string,
  supplierId: string,
): Promise<PartnershipMessage[]> {
  const supabase = (await createClient()) as any;
  const { data } = await supabase
    .from("partnership_messages")
    .select(`
      id,
      sender_id,
      venue_organization_id,
      supplier_id,
      message,
      created_at,
      sender:profiles!sender_id(full_name, avatar_url)
    `)
    .eq("venue_organization_id", venueOrgId)
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: true });

  return (data as PartnershipMessage[]) ?? [];
}

export async function sendPartnershipMessage({
  venueOrgId,
  supplierId,
  message,
  revalidate,
}: {
  venueOrgId: string;
  supplierId: string;
  message: string;
  revalidate?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = (await createClient()) as any;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Not authenticated." };

    const trimmed = message.trim();
    if (!trimmed || trimmed.length > 2000) {
      return { success: false, error: "Message must be between 1 and 2000 characters." };
    }

    const { error } = await supabase.from("partnership_messages").insert({
      venue_organization_id: venueOrgId,
      supplier_id: supplierId,
      sender_id: user.id,
      message: trimmed,
    });

    if (error) {
      console.error("Send partnership message error:", error);
      return { success: false, error: error.message };
    }

    if (revalidate) revalidatePath(revalidate);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to send message." };
  }
}
