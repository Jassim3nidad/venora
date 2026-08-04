"use client";

import type { CSSProperties } from "react";
import { cn } from "@venora/lib";

type MaterialIconProps = {
  name: string;
  className?: string;
  filled?: boolean;
};

export function MaterialIcon({ name, className, filled }: MaterialIconProps) {
  const style: CSSProperties = {
    display: "inline-block",
    width: "1em",
    minWidth: "1em",
    maxWidth: "1em",
    overflow: "hidden",
    overflowWrap: "normal",
    textTransform: "none",
    whiteSpace: "nowrap",
    wordBreak: "normal",
    ...(filled
      ? {
          fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24",
        }
      : {}),
  };

  return (
    <span
      aria-hidden="true"
      className={cn("material-symbols-outlined leading-none", className)}
      style={style}
    >
      {name}
    </span>
  );
}
