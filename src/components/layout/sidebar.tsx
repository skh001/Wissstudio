"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUIStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isActive, type NavItem } from "./nav-items";
import { useSalon } from "./salon-context";

const GROUP_LABEL = { studio: "Studio", business: "Business", account: "" } as const;

export function NavLinks({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const groups = (["studio", "business", "account"] as const).map((g) => [g, NAV_ITEMS.filter((i) => i.group === g)] as const);

  const link = (item: NavItem) => {
    const active = isActive(pathname, item.href);
    const el = (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm transition-colors",
          active ? "font-medium text-rosegold-700 dark:text-blush-200" : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
          collapsed && "justify-center px-0",
        )}
      >
        {active && (
          <motion.span
            layoutId={onNavigate ? "nav-pill-mobile" : "nav-pill"}
            className="absolute inset-0 -z-0 rounded-xl bg-secondary dark:bg-secondary"
            transition={{ type: "spring", stiffness: 500, damping: 40 }}
          />
        )}
        <item.icon className="relative h-[18px] w-[18px] shrink-0" />
        {!collapsed && <span className="relative">{item.label}</span>}
      </Link>
    );
    return collapsed ? (
      <Tooltip key={item.href}>
        <TooltipTrigger asChild>{el}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    ) : el;
  };

  return (
    <nav className="flex flex-col gap-5" aria-label="Main">
      {groups.map(([g, items]) => (
        <div key={g} className="flex flex-col gap-0.5">
          {!collapsed && GROUP_LABEL[g] && <span className="mb-1 px-3 text-[11px] text-muted-foreground/80">{GROUP_LABEL[g]}</span>}
          {items.map(link)}
        </div>
      ))}
    </nav>
  );
}

export function Sidebar() {
  const { sidebarCollapsed: collapsed, toggleSidebar } = useUIStore();
  const salon = useSalon();
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border/60 bg-card/60 px-3 py-5 backdrop-blur-xl transition-[width] duration-300 lg:flex",
        collapsed ? "w-[76px]" : "w-64",
      )}
    >
      <div className={cn("mb-7 flex items-center px-2", collapsed ? "justify-center" : "justify-between")}>
        <Link href="/dashboard" aria-label="Dashboard"><Logo collapsed={collapsed} name={salon.name} /></Link>
      </div>
      <div className="scrollbar-none flex-1 overflow-y-auto">
        <NavLinks collapsed={collapsed} />
      </div>
      <button
        onClick={toggleSidebar}
        className={cn("mt-4 flex h-9 items-center gap-2 rounded-xl px-3 text-xs text-muted-foreground transition hover:bg-accent", collapsed && "justify-center px-0")}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" /> Collapse</>}
      </button>
    </aside>
  );
}
