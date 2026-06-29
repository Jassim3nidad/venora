import Link from "next/link";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-7xl mx-auto items-center justify-between px-4 md:px-8">
        {/* Brand Logo & Tagline */}
        <Link href="/" className="flex flex-col">
          <span className="text-xl font-bold tracking-tight text-primary">Venora</span>
          <span className="hidden text-[10px] text-muted-foreground sm:inline">
            Where Extraordinary Events Begin.
          </span>
        </Link>

        {/* Center: Quick Search Trigger (Mock) */}
        <div className="hidden md:flex items-center w-1/3 max-w-sm rounded-full border px-4 py-1.5 text-sm text-muted-foreground shadow-sm hover:shadow transition-shadow cursor-pointer bg-secondary/50">
          <span>Search venues, cities, or budgets...</span>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-4">
          <Link 
            href="/venues" 
            className="text-sm font-medium hover:text-primary transition-colors hidden sm:block"
          >
            Explore Venues
          </Link>
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition-colors">
            Sign In
          </button>
        </div>
      </div>
    </header>
  );
}