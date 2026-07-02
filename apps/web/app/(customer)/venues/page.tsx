import { redirect } from "next/navigation";

/**
 * Redirect old /venues page to the unified Root page (/) which contains
 * the new premium venue browse UI and layout.
 */
export default function VenuesPage() {
  redirect("/");
}
