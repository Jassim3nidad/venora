import {
  Building2,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Lock,
  Mail,
  MessageSquareText,
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
    href: "/bookings",
    label: "Venue Bookings",
    description: "Track venue requests and payments",
    icon: CalendarDays,
  },
  {
    href: "/bookings?view=suppliers",
    label: "Supplier Inquiries",
    description: "Messages and service proposals",
    icon: Mail,
  },
  {
    href: "/account/venue-inquiries",
    label: "Venue Inquiries",
    description: "Pre-booking questions to venues",
    icon: MessageSquareText,
  },
  {
    href: "/account/payments",
    label: "Payments and Payouts",
    description: "Hosted checkout options",
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
