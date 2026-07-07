import type { Metadata } from "next";
import {
  DashboardSubPage,
  EmptyState,
} from "@/components/dashboard/enterprise";

export const metadata: Metadata = { title: "Commissions - Admin" };

export default function AdminCommissionsPage() {
  return (
    <DashboardSubPage
      title="Commission Management"
      description="Monitor platform earnings and payout summaries when payment reporting is connected."
    >
      <EmptyState
        icon="payments"
        title="No commission data yet"
        description="Commission totals will appear here after payment capture and platform fee records are connected."
      />
    </DashboardSubPage>
  );
}
