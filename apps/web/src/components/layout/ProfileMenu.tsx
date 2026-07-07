"use client";

import Link from "next/link";
import {
  Clock,
  DoorOpen,
  HelpCircle,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@venora/ui";

interface ProfileMenuProps {
  displayName: string;
  email: string;
  avatarUrl?: string | null | undefined;
  logoutAction?: () => Promise<void>;
  /**
   * Shows an "Exit Dashboard" item that sends enterprise-role users
   * (venue owner, coordinator, supplier, admin) back to the customer-facing
   * marketplace. Only relevant when this menu renders inside a dashboard
   * shell — the regular customer nav never passes this.
   */
  showExitDashboard?: boolean;
  exitDashboardHref?: string;
}

function SoonBadge() {
  return (
    <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.08em] text-slate-400">
      <Clock className="h-2.5 w-2.5" />
      Soon
    </span>
  );
}

/**
 * Shared profile-photo dropdown for the main nav bar. Replaces the
 * separate "Account" and "Logout" buttons with a single Airbnb-style
 * avatar menu that works the same on desktop and mobile.
 */
export default function ProfileMenu({
  displayName,
  email,
  avatarUrl,
  logoutAction,
  showExitDashboard = false,
  exitDashboardHref = "/venues",
}: ProfileMenuProps) {
  const avatarInitial =
    displayName?.charAt(0)?.toUpperCase() ||
    email?.charAt(0)?.toUpperCase() ||
    "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Open account menu"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E5E7EB] bg-[#EFF6FF] text-sm font-black text-[#2563EB] shadow-sm transition hover:border-[#2563EB]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/30 sm:h-11 sm:w-11"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            avatarInitial
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={10}
        className="w-[260px] rounded-2xl p-2"
      >
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#EFF6FF] text-sm font-black text-[#2563EB]">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              avatarInitial
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black tracking-[-0.02em] text-slate-950">
              {displayName}
            </p>
            <p className="truncate text-xs font-medium text-slate-500">
              {email}
            </p>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/account" className="cursor-pointer">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F9FAFB] text-[#2563EB]">
              <UserRound className="h-4 w-4" />
            </div>
            <span className="font-bold text-slate-700">Account Center</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F9FAFB] text-[#2563EB]">
              <Settings className="h-4 w-4" />
            </div>
            <span className="font-bold text-slate-700">Settings</span>
            <SoonBadge />
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link href="/help" className="cursor-pointer">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F9FAFB] text-[#2563EB]">
              <HelpCircle className="h-4 w-4" />
            </div>
            <span className="font-bold text-slate-700">Help Center</span>
            <SoonBadge />
          </Link>
        </DropdownMenuItem>

        {showExitDashboard ? (
          <DropdownMenuItem asChild>
            <Link href={exitDashboardHref} className="cursor-pointer">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F9FAFB] text-[#2563EB]">
                <DoorOpen className="h-4 w-4" />
              </div>
              <span className="font-bold text-slate-700">Exit Dashboard</span>
            </Link>
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={() => {
            if (logoutAction) {
              void logoutAction();
              return;
            }

            window.location.href = "/logout";
          }}
          className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
            <LogOut className="h-4 w-4" />
          </div>
          <span className="font-bold">Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
