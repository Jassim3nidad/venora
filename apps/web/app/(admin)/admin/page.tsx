import { AdminOverview } from "@/components/dashboard/enterprise";

export const metadata = {
  title: "Platform Administration",
  description:
    "Manage user verification, venue approval, supplier accreditation, commissions, and marketplace operations.",
};

export default function AdminDashboardPage() {
  return <AdminOverview />;
}
