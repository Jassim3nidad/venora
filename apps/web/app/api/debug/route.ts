import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCustomerInquiries } from "@/src/features/suppliers/application/customer-queries";

export async function GET() {
  const supabase = await createClient();
  const { data: { users }, error: authError } = await (supabase as any).auth.admin.listUsers();
  
  if (authError || !users?.length) {
    return NextResponse.json({ error: authError?.message || "No users" });
  }
  
  const customerId = users[0].id;
  const inquiries = await getCustomerInquiries(supabase as any, customerId);
  
  return NextResponse.json({ 
    customerId, 
    count: inquiries.length, 
    inquiries 
  });
}
