import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind class names with conflict resolution.
 * Combines clsx (conditional classes) + tailwind-merge (deduplication).
 *
 * @example
 * cn("px-4 py-2", isActive && "bg-brand-500", className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
