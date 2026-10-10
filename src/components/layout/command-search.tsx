"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CalendarHeart, FileText, Package, Plus, Receipt, User, UserPlus, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useDebounce } from "@/hooks/use-debounce";
import { useUIStore } from "@/stores/ui-store";
import { globalSearch, type SearchHit } from "@/features/search/actions";
import { NAV_ITEMS } from "./nav-items";

const GROUP_ICON: Record<SearchHit["group"], typeof User> = {
  Clients: User, Appointments: CalendarHeart, Products: Package, Invoices: FileText, Expenses: Receipt,
};

export function CommandSearch() {
  const router = useRouter();
  const { commandOpen, setCommandOpen, openQuick } = useUIStore();
  const [query, setQuery] = useState("");
  const q = useDebounce(query, 180);

  const { data, isFetching } = useQuery({
    queryKey: ["global-search", q],
    queryFn: async () => {
      const res = await globalSearch(q);
      return res.ok ? res.data : [];
    },
    enabled: q.trim().length >= 2,
    placeholderData: (prev) => prev,
  });

  const go = (href: string) => {
    setCommandOpen(false);
    setQuery("");
    router.push(href);
  };
  const groups = (["Clients", "Appointments", "Products", "Invoices", "Expenses"] as const)
    .map((g) => [g, (data ?? []).filter((h) => h.group === g)] as const)
    .filter(([, hits]) => hits.length);

  return (
    <Dialog open={commandOpen} onOpenChange={(o) => { setCommandOpen(o); if (!o) setQuery(""); }}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-xl [&>button]:hidden">
        <DialogTitle className="sr-only">Search</DialogTitle>
        <Command shouldFilter={false}>
          <CommandInput value={query} onValueChange={setQuery} placeholder="Search clients, appointments, products, invoices…" />
          <CommandList>
            {q.trim().length >= 2 && !isFetching && !groups.length && <CommandEmpty>No results for “{q}”.</CommandEmpty>}
            {groups.map(([group, hits]) => {
              const Icon = GROUP_ICON[group];
              return (
                <CommandGroup key={group} heading={group}>
                  {hits.map((h) => (
                    <CommandItem key={`${group}-${h.id}`} value={`${group}-${h.id}`} onSelect={() => go(h.href)}>
                      <Icon className="text-muted-foreground" />
                      <div className="min-w-0">
                        <div className="truncate">{h.title}</div>
                        {h.subtitle && <div className="truncate text-xs text-muted-foreground">{h.subtitle}</div>}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              );
            })}
            {q.trim().length < 2 && (
              <>
                <CommandGroup heading="Quick actions">
                  <CommandItem onSelect={() => openQuick("appointment")}><Plus />New appointment</CommandItem>
                  <CommandItem onSelect={() => openQuick("client")}><UserPlus />New client</CommandItem>
                  <CommandItem onSelect={() => openQuick("expense")}><Wallet />Add expense</CommandItem>
                  <CommandItem onSelect={() => openQuick("stock")}><Package />Update stock</CommandItem>
                </CommandGroup>
                <CommandGroup heading="Go to">
                  {NAV_ITEMS.map((n) => (
                    <CommandItem key={n.href} onSelect={() => go(n.href)}><n.icon />{n.label}</CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
