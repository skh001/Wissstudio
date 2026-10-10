"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Keyboard, LogOut, Monitor, Moon, Settings, Sun } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/features/auth/actions";
import { useUIStore } from "@/stores/ui-store";
import { initials } from "@/lib/utils";
import { useSalon } from "./salon-context";

/** Cached pages hold client data: drop them so they can't be shown offline after signing out. */
async function clearPageCache() {
  if (!("caches" in window)) return;
  const keys = await caches.keys().catch(() => [] as string[]);
  await Promise.all(keys.filter((k) => k.endsWith("-pages")).map((k) => caches.delete(k)));
}

export function UserMenu({ email }: { email: string }) {
  const salon = useSalon();
  const { setTheme, theme } = useTheme();
  const setShortcutsOpen = useUIStore((s) => s.setShortcutsOpen);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full focus-visible:ring-2" aria-label="Account menu">
        <Avatar className="h-9 w-9 ring-2 ring-blush-200">
          {salon.logo_url && <AvatarImage src={salon.logo_url} alt={salon.name} />}
          <AvatarFallback>{initials(salon.owner_name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="text-sm font-medium text-foreground">{salon.owner_name}</div>
          <div className="truncate text-xs">{email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="grid grid-cols-3 gap-1 p-1">
          {([["light", Sun], ["dark", Moon], ["system", Monitor]] as const).map(([value, Icon]) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex flex-col items-center gap-1 rounded-lg py-2 text-[11px] capitalize transition ${theme === value ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-accent"}`}
            >
              <Icon className="h-4 w-4" />{value}
            </button>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link href="/settings"><Settings />Settings</Link></DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setShortcutsOpen(true)}><Keyboard />Keyboard shortcuts</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => void clearPageCache().finally(() => signOut())}><LogOut />Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
