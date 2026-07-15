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

  let data;
  try {
    data = await getCustomerInquiryDetails(
      supabase as any,
      user.id,
      id,
    );
  } catch (error) {
    console.error("[CustomerInquiryDetailPage] Error:", error);
    // If it's a 500 error or something, we can render notFound or let error.tsx handle it.
    notFound();
  }

  if (!data || !data.inquiry) {
    notFound();
  }

  return (
    <CustomerInquiryDetail
      inquiry={data.inquiry}
      messages={data.messages}
      quote={data.quote}
    />
  );
}
