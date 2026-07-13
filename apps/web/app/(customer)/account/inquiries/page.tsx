import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCustomerInquiries } from "@/src/features/suppliers/application/customer-queries";
import { CustomerInquiryList } from "@/src/features/suppliers/ui/CustomerInquiryList";
import { CustomerPageHeader } from "@/src/components/customer/CustomerUI";
import { Mail, Search } from "lucide-react";
import { CustomerLinkButton } from "@/src/components/customer/CustomerUI";

export const metadata: Metadata = {
  title: "My Inquiries | Venora",
};

export const dynamic = "force-dynamic";

export default async function CustomerInquiriesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirectTo=/account/inquiries");
  }

  const inquiries = await getCustomerInquiries(supabase as any, user.id);

  return (
    <div className="bg-[#F8FAFC] text-[#111827]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <CustomerPageHeader
          eyebrow="Supplier Inquiries"
          icon={Mail}
          title="Track your supplier requests."
          description="View responses, review service proposals, and manage your communication with suppliers."
          action={
            <CustomerLinkButton href="/suppliers" tone="secondary">
              <Search className="h-4 w-4" />
              Browse Suppliers
            </CustomerLinkButton>
          }
        />

        <CustomerInquiryList inquiries={inquiries} />
      </div>
    </div>
  );
}
