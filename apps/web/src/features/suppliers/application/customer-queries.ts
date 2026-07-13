import type { SupabaseClient } from "@supabase/supabase-js";

export async function getCustomerInquiries(
  supabase: SupabaseClient<any, "public", any>,
  customerId: string,
) {
  const { data, error } = await supabase
    .from("supplier_contact_requests")
    .select(
      `
      id,
      status,
      event_date,
      event_location,
      guest_count,
      message,
      created_at,
      updated_at,
      venue_name_snapshot,
      event_date_snapshot,
      event_start_time_snapshot,
      guest_count_snapshot,
      supplier_services (name, price),
      supplier_profiles!inner (business_name, slug, profile_image_url),
      supplier_quotes (id, status)
      `
    )
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getCustomerInquiries] Error fetching inquiries:", error.message);
    throw new Error("Failed to fetch supplier inquiries.");
  }

  return data ?? [];
}

export async function getCustomerInquiryDetails(
  supabase: SupabaseClient<any, "public", any>,
  customerId: string,
  inquiryId: string,
) {
  const [inquiryResult, messagesResult, quoteResult] = await Promise.all([
    supabase
      .from("supplier_contact_requests")
      .select(
        `
        *,
        supplier_services (name, description, package_type, price, price_unit),
        supplier_profiles!inner (id, business_name, slug, profile_image_url, contact_email, contact_phone)
        `
      )
      .eq("id", inquiryId)
      .eq("customer_id", customerId)
      .maybeSingle(),

    supabase
      .from("supplier_inquiry_messages")
      .select("id, sender_id, message, created_at")
      .eq("inquiry_id", inquiryId)
      .order("created_at", { ascending: true }),
      
    supabase
      .from("supplier_quotes")
      .select("*, supplier_quote_items(*)")
      .eq("inquiry_id", inquiryId)
      .maybeSingle()
  ]);

  if (inquiryResult.error) {
    console.error("[getCustomerInquiryDetails] Error:", inquiryResult.error.message);
    throw new Error("Failed to fetch inquiry details.");
  }

  return {
    inquiry: inquiryResult.data,
    messages: messagesResult.data ?? [],
    quote: quoteResult.data ?? null,
  };
}
