export async function getOwnedSupplierInquiry(
  supabase: any,
  supplierId: string,
  inquiryId: string,
) {
  const { data, error } = await supabase
    .from("supplier_contact_requests")
    .select(
      "*, supplier_services(name, price), bookings(id, event_date, event_start_time, guest_count, venues(name, city, province))",
    )
    .eq("id", inquiryId)
    .eq("supplier_id", supplierId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listSupplierQuotes(supabase: any, supplierId: string) {
  const { data, error } = await supabase
    .from("supplier_quotes")
    .select(
      "*, supplier_quote_items(*), supplier_contact_requests(contact_name, event_date, venue_name_snapshot)",
    )
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getSupplierQuote(
  supabase: any,
  supplierId: string,
  quoteId: string,
) {
  const { data, error } = await supabase
    .from("supplier_quotes")
    .select(
      "*, supplier_quote_items(*), supplier_contact_requests(contact_name, event_date, venue_name_snapshot)",
    )
    .eq("id", quoteId)
    .eq("supplier_id", supplierId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getSupplierCalendarMonth(
  supabase: any,
  supplierId: string,
  startDate: string,
  endDate: string,
) {
  const [manual, jobs] = await Promise.all([
    supabase
      .from("supplier_availability")
      .select("id, date, status, reason")
      .eq("supplier_id", supplierId)
      .gte("date", startDate)
      .lte("date", endDate),
    supabase
      .from("booking_suppliers")
      .select("id, bookings!inner(event_date, venues(name))")
      .eq("supplier_id", supplierId)
      .eq("status", "confirmed")
      .gte("bookings.event_date", startDate)
      .lte("bookings.event_date", endDate),
  ]);

  if (manual.error) throw manual.error;
  if (jobs.error) throw jobs.error;
  return { manual: manual.data ?? [], jobs: jobs.data ?? [] };
}

export async function getSupplierReviews(supabase: any, supplierId: string) {
  const { data, error } = await supabase
    .from("supplier_reviews")
    .select("*, profiles!customer_id(full_name)")
    .eq("supplier_id", supplierId)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
