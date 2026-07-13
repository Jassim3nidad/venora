import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCustomerInquiryDetails } from "@/src/features/suppliers/application/customer-queries";
import { CustomerInquiryDetail } from "@/src/features/suppliers/ui/CustomerInquiryDetail";

export const metadata: Metadata = {
  title: "Inquiry Details | Venora",
};

export const dynamic = "force-dynamic";

export default async function CustomerInquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=/inquiries/${id}`);
  }

  try {
    const { inquiry, messages, quote } = await getCustomerInquiryDetails(
      supabase as any,
      user.id,
      id,
    );

    if (!inquiry) {
      notFound();
    }

    return (
      <CustomerInquiryDetail inquiry={inquiry} messages={messages} quote={quote} />
    );
  } catch (error) {
    console.error("[CustomerInquiryDetailPage] Error:", error);
    notFound();
  }
}
