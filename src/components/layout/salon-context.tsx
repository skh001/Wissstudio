"use client";

import { createContext, useContext, useEffect } from "react";
import { useTheme } from "next-themes";
import { configureFormatting } from "@/lib/format";
import type { SalonSettings } from "@/types/domain";

const SalonContext = createContext<SalonSettings | null>(null);

export function SalonProvider({ settings, children }: { settings: SalonSettings; children: React.ReactNode }) {
  configureFormatting({ language: settings.language, currency: settings.currency });
  const { setTheme } = useTheme();
  useEffect(() => { setTheme(settings.theme); }, [settings.theme, setTheme]);
  return <SalonContext.Provider value={settings}>{children}</SalonContext.Provider>;
}

export function useSalon() {
  const ctx = useContext(SalonContext);
  if (!ctx) throw new Error("useSalon must be used inside SalonProvider");
  return ctx;
}
