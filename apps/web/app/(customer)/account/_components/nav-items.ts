import {
  Building2,
  CalendarDays,
  CreditCard,
  Gavel,
  LayoutDashboard,
  Lock,
  Mail,
  MessageSquareText,
  Receipt,
  Users,
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
    href: "/account/guests",
    label: "Guest Management",
    description: "Guest list, responses, and requirements",
    icon: Users,
  },
  {
    href: "/account/messages",
    label: "Messages",
    description: "Unified inbox for all conversations",
    icon: Mail,
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
    label: "Billing & Payments",
    description: "Invoices, receipts, and checkout",
    icon: Receipt,
  },

  {
    href: "/account/disputes",
    label: "Disputes",
    description: "Cases you raised for platform review",
    icon: Gavel,
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
