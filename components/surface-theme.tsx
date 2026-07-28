"use client";

import { createContext, useContext } from "react";

import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

export type ProductSurface = "site" | "admin";

const SurfaceThemeContext = createContext<ProductSurface | null>(null);

function getSurfaceClassName(surface: ProductSurface) {
  return `surface-${surface}`;
}

export function SurfaceTheme({
  children,
  className,
  surface,
}: Readonly<{
  children: React.ReactNode;
  className?: string;
  surface: ProductSurface;
}>) {
  const surfaceClassName = getSurfaceClassName(surface);

  return (
    <SurfaceThemeContext.Provider value={surface}>
      <div
        className={cn(surfaceClassName, className)}
        data-product-surface={surface}
      >
        {children}
      </div>
      <Toaster className={cn("toaster group", surfaceClassName)} />
    </SurfaceThemeContext.Provider>
  );
}

export function useSurfaceClassName() {
  const surface = useContext(SurfaceThemeContext);

  return surface ? getSurfaceClassName(surface) : undefined;
}
