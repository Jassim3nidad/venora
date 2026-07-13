import { redirect } from "next/navigation";

export default async function CustomerInquiryDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/inquiries/${id}`);
}
