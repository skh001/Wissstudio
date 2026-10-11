"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import type { SalonSettings } from "@/types/domain";
import { QuickDialogs } from "@/features/quick-actions/quick-dialogs";
import { LiveUpdates } from "@/features/live/live-updates";
import { CommandSearch } from "./command-search";
import { MobileNav } from "./mobile-nav";
import { SalonProvider } from "./salon-context";
import { ShortcutsDialog } from "./shortcuts-dialog";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ settings, email, children }: { settings: SalonSettings; email: string; children: React.ReactNode }) {
  useKeyboardShortcuts();
  const pathname = usePathname();
  return (
    <SalonProvider settings={settings}>
      <div className="flex min-h-dvh">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar email={email} />
          <motion.main
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pb-12"
            >
              {children}
          </motion.main>
        </div>
      </div>
      <MobileNav />
      <CommandSearch />
      <ShortcutsDialog />
      <QuickDialogs />
      <LiveUpdates ownerId={settings.owner_id} />
    </SalonProvider>
  );
}
