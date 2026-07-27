import { redirect } from "next/navigation";

export default function LegacyGuestManagementPage() {
  redirect("/account/guests");
}
