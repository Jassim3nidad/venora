"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { cn } from "@venora/lib";

type MaterialIconProps = {
  name: string;
  className?: string;
  filled?: boolean;
};

let materialSymbolsReady = false;
let materialSymbolsPromise: Promise<void> | null = null;

function loadMaterialSymbols() {
  if (materialSymbolsReady) return Promise.resolve();
  if (materialSymbolsPromise) return materialSymbolsPromise;

  if (typeof document === "undefined" || !("fonts" in document)) {
    materialSymbolsReady = true;
    return Promise.resolve();
  }

  const fonts = document.fonts;
  if (fonts.check('1em "Material Symbols Outlined"')) {
    materialSymbolsReady = true;
    return Promise.resolve();
  }

  materialSymbolsPromise = fonts
    .load('1em "Material Symbols Outlined"')
    .then(() => {
      materialSymbolsReady = true;
    })
    .catch(() => {
      materialSymbolsReady = true;
    });

  return materialSymbolsPromise;
}

export function MaterialIcon({ name, className, filled }: MaterialIconProps) {
  const [isReady, setIsReady] = useState(materialSymbolsReady);

  useEffect(() => {
    let active = true;

    loadMaterialSymbols().then(() => {
      if (active) setIsReady(true);
    });

    return () => {
      active = false;
    };
  }, []);

  const style: CSSProperties = {
    display: "inline-block",
    width: "1em",
    minWidth: "1em",
    maxWidth: "1em",
    overflow: "hidden",
    overflowWrap: "normal",
    textTransform: "none",
    visibility: isReady ? "visible" : "hidden",
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
