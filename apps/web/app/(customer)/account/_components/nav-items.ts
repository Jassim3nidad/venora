import {
  Building2,
  CreditCard,
  LayoutDashboard,
  Lock,
  Receipt,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export interface AccountNavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const ACCOUNT_NAV_ITEMS: AccountNavItem[] = [
  {
    href: "/account",
    label: "Personal Information",
    description: "Profile details and account security",
    icon: UserRound,
  },
  {
    href: "/account/dashboard",
    label: "Customer Dashboard",
    description: "Bookings, spending, and activity overview",
    icon: LayoutDashboard,
  },
  {
    href: "/account/payments",
    label: "Payments and Payouts",
    description: "Saved payment methods",
    icon: CreditCard,
  },
  {
    href: "/account/transactions",
    label: "Transactions",
    description: "Your booking payment history",
    icon: Receipt,
  },
  {
    href: "/account/privacy",
    label: "Privacy and Sharing",
    description: "Data and communication preferences",
    icon: Lock,
  },
  {
    href: "/account/become-partner",
    label: "Become a Partner",
    description: "Apply for a Vendor workspace",
    icon: Building2,
  },
];
