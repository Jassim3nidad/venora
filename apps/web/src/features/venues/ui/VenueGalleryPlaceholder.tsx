import { Image as ImageIcon } from "lucide-react";
import { cn } from "@venora/lib";

interface VenueGalleryPlaceholderProps {
  variant?: "hero" | "slot";
  className?: string;
}

export default function VenueGalleryPlaceholder({
  variant = "hero",
  className,
}: VenueGalleryPlaceholderProps) {
  if (variant === "slot") {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center rounded-xl border border-dashed border-[var(--border-default)] bg-slate-50",
          className
        )}
      >
        <ImageIcon className="h-5 w-5 text-slate-300" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-[280px] w-full flex-col items-center justify-center rounded-none border border-[var(--border-default)] bg-gradient-to-br from-slate-100 to-slate-200 p-6 text-center md:h-[450px] md:rounded-2xl",
        className
      )}
    >
      <ImageIcon className="mb-3 h-10 w-10 text-[var(--text-muted)]" />
      <p className="text-sm font-semibold text-[var(--text-primary)]">
        Photos coming soon
      </p>
      <p className="mt-1 max-w-xs text-xs text-[var(--text-muted)]">
        The host has not uploaded gallery images for this venue yet.
      </p>
    </div>
  );
}
