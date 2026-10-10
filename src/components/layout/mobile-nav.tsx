"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Menu, Plus, Users } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Logo } from "@/components/shared/logo";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import { NavLinks } from "./sidebar";
import { isActive } from "./nav-items";

/** Phone: bottom tab bar with a central "new appointment" button + a sheet with every section. */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const openQuick = useUIStore((s) => s.openQuick);

  const tab = (href: string, label: string, Icon: typeof Home) => (
    <Link href={href} className={cn("flex flex-1 flex-col items-center gap-1 py-2 text-[11px]", isActive(pathname, href) ? "text-primary" : "text-muted-foreground")}>
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );

  return (
    <>
      <nav className="glass fixed inset-x-0 bottom-0 z-40 border-t border-border/60 pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Quick navigation">
        <div className="mx-auto flex max-w-md items-end">
          {tab("/dashboard", "Home", Home)}
          {tab("/calendar", "Calendar", CalendarDays)}
          <div className="flex flex-1 justify-center">
            <button
              onClick={() => openQuick("appointment")}
              className="-mt-5 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lift ring-4 ring-background transition active:scale-95"
              aria-label="New appointment"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>
          {tab("/clients", "Clients", Users)}
          <button onClick={() => setOpen(true)} className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] text-muted-foreground">
            <Menu className="h-5 w-5" />
            More
          </button>
        </div>
      </nav>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[82%] px-3">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="mb-6 px-2"><Logo /></div>
          <NavLinks onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
