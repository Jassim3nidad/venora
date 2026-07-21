"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, ShoppingBag, Menu, X, User } from "lucide-react";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import ProfileMenu from "@/components/layout/ProfileMenu";

export default function StorefrontNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user: currentUser } = useCurrentUser();

  const isAdmin = currentUser?.roles?.includes("admin") ?? false;
  const isAuthenticated = Boolean(currentUser);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-base/90 backdrop-blur-xl">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Left: Mobile Menu Toggle & Search (Mobile) */}
        <div className="flex flex-1 items-center gap-4 md:hidden">
          <button
            type="button"
            className="text-text-primary"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <button type="button" className="text-text-primary" aria-label="Search">
            <Search className="h-5 w-5" />
          </button>
        </div>

        {/* Left: Desktop Navigation */}
        <nav className="hidden flex-1 items-center gap-8 md:flex">
          <Link href="/shop" className="text-sm font-semibold uppercase tracking-wider text-text-primary transition hover:text-brand-500">
            Shop
          </Link>
          <Link href="/collections" className="text-sm font-semibold uppercase tracking-wider text-text-primary transition hover:text-brand-500">
            Collections
          </Link>
          <Link href="/about" className="text-sm font-semibold uppercase tracking-wider text-text-primary transition hover:text-brand-500">
            About
          </Link>
        </nav>

        {/* Center: Logo */}
        <div className="flex justify-center text-center">
          <Link href="/" className="font-display text-2xl font-black tracking-widest text-text-primary transition hover:text-brand-500 md:text-3xl">
            7SS
          </Link>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-1 items-center justify-end gap-5">
          <button type="button" className="hidden text-text-primary hover:text-brand-500 md:block" aria-label="Search">
            <Search className="h-5 w-5" />
          </button>

          {isAuthenticated ? (
            <div className="hidden md:block">
               <ProfileMenu
                  displayName={currentUser?.fullName || currentUser?.email?.split("@")[0] || "User"}
                  email={currentUser?.email ?? ""}
                  avatarUrl={currentUser?.avatarUrl}
                  showAdminDashboard={isAdmin}
               />
            </div>
          ) : (
            <div className="hidden items-center gap-4 md:flex">
              <Link href="/login" className="text-sm font-semibold uppercase tracking-wider text-text-primary hover:text-brand-500">
                Log In
              </Link>
            </div>
          )}

          <button type="button" className="text-text-primary hover:text-brand-500 relative" aria-label="Cart">
            <ShoppingBag className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {menuOpen && (
        <div className="absolute inset-x-0 top-20 flex flex-col border-b border-border bg-base p-4 shadow-xl md:hidden">
          <nav className="flex flex-col gap-4">
            <Link href="/shop" className="text-lg font-bold uppercase tracking-widest text-text-primary" onClick={closeMenu}>
              Shop
            </Link>
            <Link href="/collections" className="text-lg font-bold uppercase tracking-widest text-text-primary" onClick={closeMenu}>
              Collections
            </Link>
            <Link href="/about" className="text-lg font-bold uppercase tracking-widest text-text-primary" onClick={closeMenu}>
              About
            </Link>
            
            <hr className="my-2 border-border" />
            
            {isAuthenticated ? (
              <>
                <Link href="/account" className="flex items-center gap-3 text-sm font-bold text-text-primary" onClick={closeMenu}>
                  <User className="h-5 w-5" /> My Account
                </Link>
                {isAdmin && (
                  <Link href="/admin" className="flex items-center gap-3 text-sm font-bold text-brand-500" onClick={closeMenu}>
                    The Vault
                  </Link>
                )}
                <Link href="/logout" className="text-sm font-bold text-text-secondary" onClick={closeMenu}>
                  Log Out
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-bold uppercase tracking-widest text-text-primary" onClick={closeMenu}>
                  Log In
                </Link>
                <Link href="/register" className="text-sm font-bold uppercase tracking-widest text-brand-500" onClick={closeMenu}>
                  Create Account
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
