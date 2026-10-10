"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ClientAvatar } from "@/components/shared/client-avatar";
import { cn, fullName } from "@/lib/utils";
import { upsertClient } from "../actions";
import { toast } from "sonner";

type Option = { id: string; first_name: string; last_name: string; phone: string | null; avatar_url: string | null; is_vip: boolean };

export function ClientPicker({
  clients,
  value,
  onChange,
  onCreated,
}: {
  clients: Option[];
  value: string | null;
  onChange: (id: string | null) => void;
  onCreated?: (client: Option) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const selected = clients.find((c) => c.id === value) ?? null;

  const q = search.trim().toLowerCase();
  const filtered = q
    ? clients.filter((c) => `${c.first_name} ${c.last_name} ${c.phone ?? ""}`.toLowerCase().includes(q)).slice(0, 50)
    : clients.slice(0, 50);

  async function create() {
    const [first, ...rest] = search.trim().split(/\s+/);
    if (!first) return;
    setCreating(true);
    const res = await upsertClient({ first_name: first, last_name: rest.join(" "), tags: [], is_favorite: false, is_vip: false });
    setCreating(false);
    if (!res.ok) return toast.error(res.error);
    const client = { id: res.data.id, first_name: first, last_name: rest.join(" "), phone: null, avatar_url: null, is_vip: false };
    onCreated?.(client);
    onChange(client.id);
    toast.success(`${fullName(client)} added to your clients`);
    setOpen(false);
    setSearch("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="h-12 w-full justify-between rounded-xl px-3 font-normal">
          {selected ? (
            <span className="flex min-w-0 items-center gap-2.5">
              <ClientAvatar client={selected} className="h-7 w-7" showVip={false} />
              <span className="truncate">{fullName(selected)}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">Choose a client or walk-in</span>
          )}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput value={search} onValueChange={setSearch} placeholder="Name or phone…" className="h-11 text-sm" />
          <CommandList className="max-h-72">
            <CommandEmpty>No client found.</CommandEmpty>
            {search.trim().length >= 2 && (
              <CommandGroup>
                <CommandItem onSelect={create} disabled={creating} className="text-primary">
                  <UserPlus />Add “{search.trim()}” as a new client
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              {!q && (
                <CommandItem onSelect={() => { onChange(null); setOpen(false); }}>
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-muted text-xs">—</span>Walk-in (no client)
                </CommandItem>
              )}
              {filtered.map((c) => (
                <CommandItem key={c.id} value={c.id} onSelect={() => { onChange(c.id); setOpen(false); setSearch(""); }}>
                  <ClientAvatar client={c} className="h-7 w-7" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{fullName(c)}</div>
                    {c.phone && <div className="text-xs text-muted-foreground">{c.phone}</div>}
                  </div>
                  <Check className={cn("text-primary", value === c.id ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
