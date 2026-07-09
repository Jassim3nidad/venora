import type { Metadata } from "next";
import { CustomerDashboardView } from "@/features/customer/ui/CustomerDashboardView";

export const metadata: Metadata = {
  title: "Customer Dashboard",
};

export const dynamic = "force-dynamic";

export default function AccountCustomerDashboardPage() {
  return <CustomerDashboardView />;
}
