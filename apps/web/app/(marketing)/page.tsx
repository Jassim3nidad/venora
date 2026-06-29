import { Button } from "@venora/ui/button";
import { Card, CardContent, CardFooter } from "@venora/ui/card";
import { Input } from "@venora/ui/input";

export default function MarketingHomePage() {
  return (
    <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-12">
      {/* AI Hero Section */}
      <section className="relative rounded-2xl bg-zinc-900 text-white p-8 md:p-16 shadow-lg flex flex-col items-center text-center justify-center min-h-[320px] border border-zinc-800">
        <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold mb-3">
          ✨ AI-Powered Venue Discovery
        </span>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6 max-w-2xl">
          Find the Perfect Canvas for Your Celebration
        </h1>
        
        <div className="w-full max-w-xl flex gap-2">
          <Input 
            placeholder="e.g., Beachfront venue in Batangas for 150 guests under ₱500k..." 
            className="bg-white text-zinc-900 border-0 h-11"
            disabled
          />
          <Button className="h-11 px-6 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-semibold">
            AI Search
          </Button>
        </div>
      </section>

      {/* Featured Grid Skeleton */}
      <section className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight">Featured Philippine Venues</h2>
          <span className="text-sm text-muted-foreground">Showing skeleton UI</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden animate-pulse">
              <div className="h-48 bg-secondary w-full" />
              <CardContent className="p-5 space-y-3">
                <div className="h-5 bg-secondary rounded w-3/4" />
                <div className="h-4 bg-secondary/60 rounded w-1/2" />
              </CardContent>
              <CardFooter className="p-5 pt-0 flex justify-between items-center">
                <div className="h-4 bg-secondary rounded w-1/3" />
                <div className="h-8 bg-secondary rounded w-1/4" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      {/* ─── Airbnb-style Category Tabs Bar ─── */}
      <section className="px-6 md:px-12 border-b border-zinc-100 w-full flex justify-center">
        <div className="w-full max-w-[1400px] flex items-center justify-start gap-10 overflow-x-auto py-5 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.slug;

            return (
              <Link
                key={cat.slug}
                href={`/?category=${cat.slug}&location=${searchLocation}&guests=${params.guests ?? ""}`}
                className={`flex flex-col items-center gap-2 pb-2 text-[12px] font-semibold tracking-tight transition-all hover:text-zinc-900 border-b-2 hover:border-zinc-300 ${
                  isActive
                    ? "border-zinc-950 text-zinc-950 font-bold"
                    : "border-transparent text-zinc-500"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{cat.name}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ─── Standard Venue Grids ─── */}
      <section className="w-full max-w-[1400px] px-6 md:px-12 py-10">
        {filteredVenues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Search className="h-12 w-12 text-zinc-200 mb-3" />
            <h3 className="font-bold text-zinc-950 text-[15px]">No listings match your search</h3>
            <p className="text-xs text-zinc-500 mt-1">Try resetting the destination queries or capacity guest counts.</p>
            <Link
              href="/"
              className="mt-5 rounded-xl border border-zinc-250 bg-white px-5 py-2.5 text-xs font-semibold hover:bg-zinc-50 transition-colors"
            >
              Clear Filters
            </Link>
          </div>
        ) : showSections ? (
          <div className="space-y-16 animate-slide-up">
            {/* Section 1: Metro Manila */}
            <div className="space-y-6">
              <div className="flex items-center gap-1.5 cursor-pointer group">
                <h2 className="text-xl font-bold tracking-tight text-zinc-950 font-display">
                  Popular wedding estates in Metro Manila
                </h2>
                <ChevronRight className="h-5 w-5 text-zinc-800 transition-transform group-hover:translate-x-0.5" />
              </div>
              <div className="grid gap-x-6 gap-y-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {manilaVenues.map((venue: any) => (
                  <VenueCard key={venue.id} venue={venue} />
                ))}
              </div>
            </div>

            {/* Section 2: Regional Escapes */}
            <div className="space-y-6">
              <div className="flex items-center gap-1.5 cursor-pointer group">
                <h2 className="text-xl font-bold tracking-tight text-zinc-950 font-display">
                  Scenic retreats in Cavite & Batangas
                </h2>
                <ChevronRight className="h-5 w-5 text-zinc-800 transition-transform group-hover:translate-x-0.5" />
              </div>
              <div className="grid gap-x-6 gap-y-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {provincialVenues.map((venue: any) => (
                  <VenueCard key={venue.id} venue={venue} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-slide-up">
            <h2 className="text-xl font-bold tracking-tight text-zinc-950 font-display">
              Search Results
            </h2>
            <div className="grid gap-x-6 gap-y-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredVenues.map((venue: any) => (
                <VenueCard key={venue.id} venue={venue} />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Sub-Component: Borderless Venue Card ───
function VenueCard({ venue }: { venue: any }) {
  return (
    <Link href={`/venues/${venue.slug}`} className="group block space-y-2">
      {/* Card Image Cover wrapper */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-zinc-100">
        <Image
          src={venue.cover_image}
          alt={venue.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.015]"
          sizes="(max-width: 768px) 100vw, 25vw"
        />

        {/* Favorite Heart Outline */}
        <div className="absolute right-3.5 top-3.5 text-white hover:scale-105 transition-transform duration-150">
          <Heart className="h-6 w-6 stroke-white fill-black/30 stroke-[2px] hover:fill-rose-600 hover:stroke-rose-600" />
        </div>

        {/* Guest favorite Tag */}
        {venue.avg_rating >= 4.8 && (
          <div className="absolute left-3.5 top-3.5 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-black tracking-tight text-zinc-950 shadow-sm border border-zinc-150">
            Guest favorite
          </div>
        )}
      </div>

      {/* Meta Labels Block */}
      <div className="space-y-1 text-xs">
        {/* City/Province & Rating */}
        <div className="flex items-center justify-between text-[14px]">
          <span className="font-extrabold text-zinc-950">
            {venue.city}, {venue.province}
          </span>
          <span className="flex items-center gap-1 text-zinc-950">
            <Star className="h-3.5 w-3.5 fill-zinc-950 text-zinc-950" />
            <span className="font-bold">{venue.avg_rating.toFixed(2)}</span>
          </span>
        </div>

        {/* Title */}
        <p className="text-zinc-500 font-medium text-[13px] line-clamp-1">{venue.name}</p>

        {/* Guest capacity */}
        <p className="text-zinc-400 font-normal text-[12px]">Max {venue.capacity_max} guests</p>

        {/* Price tag */}
        <div className="text-[13px] font-bold text-zinc-950 pt-0.5">
          ₱{venue.base_price.toLocaleString()}
          <span className="text-zinc-500 font-normal ml-0.5">per event</span>
        </div>
      </div>
    </Link>
  );
}