import type { ReactNode } from "react";
import Link from "next/link";
import { Sparkles, Bell, HelpCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import "../globals.css";

export default async function CustomerLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userRoles: string[] = [];
  if (user) {
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    userRoles = (roleRows ?? []).map((r: any) => r.role as string);
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#F8FAFC]">
      {/* Premium Top Navigation (matches marketing page layout) */}
      <nav className="sticky top-0 z-50 flex !h-[64px] w-full shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 !px-[32px] backdrop-blur-md">
        <Link
          href="/"
          className="flex items-center !gap-[6px] !text-[20px] !font-extrabold !leading-[28px] tracking-tight text-[#E07A5F]"
        >
          Venora
          <Sparkles className="!h-[16px] !w-[16px] fill-[#E07A5F] text-[#E07A5F]" />
        </Link>

        <div className="hidden h-full items-center !gap-[32px] md:flex">
          <Link
            href="/"
            className="flex h-full items-center !text-[12px] !font-bold uppercase !tracking-[0.14em] text-slate-500 transition-colors hover:text-[#E07A5F]"
          >
            Browse
          </Link>

          <Link
            href="/bookings"
            className="flex h-full items-center !text-[12px] !font-bold uppercase !tracking-[0.14em] text-slate-500 transition-colors hover:text-[#E07A5F]"
          >
            Bookings
          </Link>

          {userRoles.includes("venue_owner") && (
            <Link
              href="/dashboard"
              className="flex h-full items-center !text-[12px] !font-bold uppercase !tracking-[0.14em] text-slate-500 transition-colors hover:text-[#E07A5F]"
            >
              Venue Dashboard
            </Link>
          )}

          {userRoles.includes("event_coordinator") && (
            <Link
              href="/dashboard"
              className="flex h-full items-center !text-[12px] !font-bold uppercase !tracking-[0.14em] text-slate-500 transition-colors hover:text-[#E07A5F]"
            >
              Coordinator Dashboard
            </Link>
          )}

          {userRoles.includes("supplier") && (
            <Link
              href="/dashboard/supplier"
              className="flex h-full items-center !text-[12px] !font-bold uppercase !tracking-[0.14em] text-slate-500 transition-colors hover:text-[#E07A5F]"
            >
              Supplier Dashboard
            </Link>
          )}

          {userRoles.includes("admin") && (
            <Link
              href="/admin"
              className="flex h-full items-center !text-[12px] !font-bold uppercase !tracking-[0.14em] text-slate-500 transition-colors hover:text-[#E07A5F]"
            >
              Admin Panel
            </Link>
          )}
        </div>

        <div className="flex items-center !gap-[14px]">
          <button
            type="button"
            className="flex !h-[36px] !w-[36px] items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Notifications"
          >
            <Bell className="!h-[18px] !w-[18px]" />
          </button>

          <button
            type="button"
            className="flex !h-[36px] !w-[36px] items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Help"
          >
            <HelpCircle className="!h-[18px] !w-[18px]" />
          </button>

          <Link
            href="/account"
            className="flex !h-[38px] items-center justify-center rounded-[12px] bg-[#E07A5F] !px-[18px] !text-[12px] !font-bold uppercase !tracking-[0.12em] text-white shadow-sm transition hover:bg-[#d96851]"
          >
            Account
          </Link>
        </div>
      </nav>

      {/* Main content body */}
      <main className="flex-1 w-full bg-[#F8FAFC]">
        {children}
      </main>
    </div>
  );
}
