"use client";

import type { ReactNode } from "react";
import { EnterpriseShell } from "@/components/dashboard/enterprise";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <EnterpriseShell
      role="admin"
      userName="Alex Vance"
      userSubtitle="Super Admin"
      userAvatar="https://lh3.googleusercontent.com/aida-public/AB6AXuDPfY8gsD5If251GlYV3AOgRFiwCIxUNMq2Kv-WGfls1kOvZtDRj0bi-a9ZhDnIVztOv4U9huyt8orOBvUQ8CfOv9tIOC0321Fb4lw0vh8tZCFHoqr2cUVQ0cZzCK9PeYQtvTMOq0rZplKjwOlqiZX2Z5EHba-r_LKPwEWfId0m5kutxdAw1LkSan3c9G3MKrMtB2Up8ytHnU9asaCbWdalvJ8l4_4_T3LsasBbjRAYhvnBbJ5Vw-JXKD5uYL3iQM6WeUdcctw0-P4_"
    >
      {children}
    </EnterpriseShell>
  );
}
