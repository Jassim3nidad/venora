import type { Metadata } from "next";
import { DashButton, DashboardSubPage, Panel } from "@/components/dashboard/enterprise/ui";
import { MaterialIcon } from "@/components/dashboard/enterprise/MaterialIcon";

export const metadata: Metadata = { title: "Staff — Dashboard" };

export default function StaffPage() {
  return (
    <DashboardSubPage
      title="Staff Management"
      description="Invite team members, assign roles, and manage operational permissions."
      action={
        <DashButton>
          <MaterialIcon name="person_add" className="text-[18px]" />
          Invite Staff
        </DashButton>
      }
    >
      <Panel className="border-dashed bg-[#fafbfc] py-16 text-center">
        <MaterialIcon name="group" className="mx-auto mb-3 text-[32px] text-[#9a442d]" />
        <p className="font-display text-lg font-semibold">Build your venue team</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#565e74]">
          Add coordinators and staff to help manage bookings, calendars, and day-of operations.
        </p>
      </Panel>
    </DashboardSubPage>
  );
}
