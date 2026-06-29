export function Sidebar() {
  return (
    <aside className="w-full md:w-64 p-6 border-r hidden md:block shrink-0 min-h-[calc(100vh-4rem)] bg-card">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold tracking-tight mb-2">Discovery Filters</h3>
          <p className="text-sm text-muted-foreground">Refine your event space search.</p>
        </div>

        <hr className="border-border" />

        {/* Location Filter Skeleton */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Province / Region</label>
          <div className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground flex items-center">
            Select location...
          </div>
        </div>

        {/* Event Type Skeleton */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Event Type</label>
          <div className="space-y-1.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <input type="checkbox" className="rounded border-input" disabled />
              <span>Weddings</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="rounded border-input" disabled />
              <span>Corporate Functions</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="rounded border-input" disabled />
              <span>Debuts & Birthdays</span>
            </div>
          </div>
        </div>

        {/* Budget Skeleton */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Max Budget</label>
          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary w-1/2"></div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>₱50k</span>
            <span>₱500k+</span>
          </div>
        </div>
      </div>
    </aside>
  );
}