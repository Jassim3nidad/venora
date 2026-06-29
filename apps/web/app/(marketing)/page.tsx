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
    </main>
  );
}