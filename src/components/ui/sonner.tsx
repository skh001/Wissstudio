"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={(resolvedTheme as "light" | "dark") ?? "light"}
      position="top-center"
      richColors={false}
      toastOptions={{
        classNames: {
          toast: "rounded-2xl border border-border bg-card text-foreground shadow-lift font-sans",
          description: "text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground rounded-full",
        },
      }}
    />
  );
}
