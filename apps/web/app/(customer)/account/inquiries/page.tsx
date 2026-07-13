import { redirect } from "next/navigation";

export default function CustomerInquiryListRedirect() {
  redirect("/bookings?view=suppliers");
}
