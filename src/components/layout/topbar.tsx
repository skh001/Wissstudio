"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/shared/logo";
import { useUIStore } from "@/stores/ui-store";
import { NotificationsBell } from "./notifications-bell";
import { UserMenu } from "./user-menu";

export function Topbar({ email }: { email: string }) {
  const setCommandOpen = useUIStore((s) => s.setCommandOpen);
  return (
    <header className="glass sticky top-0 z-30 border-b border-border/60 pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <LogoMark className="h-8 w-8 lg:hidden" />
        <button
          onClick={() => setCommandOpen(true)}
          className="flex h-10 flex-1 items-center gap-2.5 rounded-full border border-border bg-card/80 px-4 text-sm text-muted-foreground transition hover:border-primary/40 sm:max-w-md"
        >
          <Search className="h-4 w-4" />
          <span className="truncate">Search clients, appointments…</span>
          <kbd className="ml-auto hidden rounded-md border bg-muted px-1.5 py-0.5 font-sans text-[11px] sm:inline">⌘K</kbd>
        </button>
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" className="sm:hidden" onClick={() => setCommandOpen(true)} aria-label="Search">
            <Search className="h-[18px] w-[18px]" />
          </Button>
          <NotificationsBell />
          <UserMenu email={email} />
        </div>
      </div>
    </header>
  );
}
