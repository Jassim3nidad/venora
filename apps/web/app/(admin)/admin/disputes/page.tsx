import type { Metadata } from "next";
import {
  DashboardSubPage,
  EmptyState,
  Panel,
  PanelHeader,
} from "@/components/dashboard/enterprise";
import { requirePermissionOrRedirect } from "@/lib/rbac/admin-context";

export const metadata: Metadata = { title: "Disputes - Admin | Venora" };
export const dynamic = "force-dynamic";

export default async function AdminDisputesPage() {
  await requirePermissionOrRedirect("reports.view");

  return (
    <DashboardSubPage
      title="Disputes"
      description="Review booking, payment, and marketplace disputes that require administrator follow-up."
    >
      <Panel>
        <PanelHeader
          title="Open disputes"
          description="Dispute case records will appear here when escalation workflows are enabled."
        />
        <EmptyState
          icon="gavel"
          title="No disputes to review"
          description="Booking and payment dispute cases will be listed here."
        />
      </Panel>
    </DashboardSubPage>
  );
}
