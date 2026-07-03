import type { Metadata } from "next";
import {
  DashboardSubPage,
  DashButton,
  EmptyState,
  Panel,
} from "@/components/dashboard/enterprise";

export const metadata: Metadata = { title: "Staff — Dashboard" };

export default function StaffPage() {
  return (
    <DashboardSubPage
      title="Staff Management"
      description="Invite and manage venue staff, roles, and operational permissions."
      action={<DashButton icon="person_add">Invite Staff</DashButton>}
    >
      <Panel>
        <EmptyState
          icon="groups"
          title="No staff members yet"
          description="Invite team members to help manage bookings, calendar, and venue operations."
          action={<DashButton icon="person_add">Invite Staff</DashButton>}
        />
      </Panel>
    </DashboardSubPage>
  );
}
