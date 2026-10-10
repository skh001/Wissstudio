"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { differenceInDays } from "date-fns";
import { motion } from "framer-motion";
import { ArrowDownUp, Crown, Download, Heart, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChipFilter } from "@/components/shared/chip-filter";
import { ClientAvatar } from "@/components/shared/client-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { useSalon } from "@/components/layout/salon-context";
import { useServerAction } from "@/hooks/use-server-action";
import { downloadFile, parseCSV, toCSV } from "@/lib/csv";
import { formatCurrency, formatDate } from "@/lib/format";
import { fullName } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import type { ClientWithStats } from "@/types/domain";
import { importClients, toggleClientFlag } from "../actions";

type Filter = "all" | "favorites" | "vip" | "inactive" | "birthdays";
type Sort = "name" | "last_visit" | "spent" | "visits" | "recent";

export function ClientsView({ clients }: { clients: ClientWithStats[] }) {
  const salon = useSalon();
  const openQuick = useUIStore((s) => s.openQuick);
  const { run } = useServerAction();
  const fileRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("name");

  const isInactive = (c: ClientWithStats) =>
    !c.stats.next_visit && (!c.stats.last_visit || differenceInDays(new Date(), new Date(c.stats.last_visit)) > salon.inactive_after_days);
  const birthdayThisMonth = (c: ClientWithStats) => !!c.birthday && Number(c.birthday.slice(5, 7)) === new Date().getMonth() + 1;

  const counts = useMemo(() => ({
    all: clients.length,
    favorites: clients.filter((c) => c.is_favorite).length,
    vip: clients.filter((c) => c.is_vip).length,
    inactive: clients.filter(isInactive).length,
    birthdays: clients.filter(birthdayThisMonth).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [clients]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = clients.filter((c) => {
      if (filter === "favorites" && !c.is_favorite) return false;
      if (filter === "vip" && !c.is_vip) return false;
      if (filter === "inactive" && !isInactive(c)) return false;
      if (filter === "birthdays" && !birthdayThisMonth(c)) return false;
      if (!q) return true;
      return [c.first_name, c.last_name, c.phone, c.email, c.instagram, ...(c.tags ?? [])].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
    const by: Record<Sort, (a: ClientWithStats, b: ClientWithStats) => number> = {
      name: (a, b) => fullName(a).localeCompare(fullName(b), "fr"),
      last_visit: (a, b) => (b.stats.last_visit ?? "").localeCompare(a.stats.last_visit ?? ""),
      spent: (a, b) => Number(b.stats.total_spent) - Number(a.stats.total_spent),
      visits: (a, b) => b.stats.appointments_count - a.stats.appointments_count,
      recent: (a, b) => b.created_at.localeCompare(a.created_at),
    };
    rows = [...rows].sort(by[sort]);
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, query, filter, sort]);

  function exportCSV() {
    const rows = list.map((c) => ({
      first_name: c.first_name, last_name: c.last_name, phone: c.phone, email: c.email, instagram: c.instagram,
      birthday: c.birthday, vip: c.is_vip ? "yes" : "", favorite: c.is_favorite ? "yes" : "", tags: c.tags,
      total_spent: c.stats.total_spent, appointments: c.stats.appointments_count, last_visit: c.stats.last_visit?.slice(0, 10),
      loyalty_points: c.loyalty_points, allergies: c.allergies, notes: c.notes,
    }));
    downloadFile(toCSV(rows), `wissnails-clients-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  async function onImport(file?: File) {
    if (!file) return;
    const rows = parseCSV(await file.text());
    if (!rows.length) return toast.error("This file is empty or isn't a CSV.");
    await run(() => importClients(rows), {
      onSuccess: (r) => toast.success(`${r.imported} client${r.imported > 1 ? "s" : ""} imported${r.skipped ? ` · ${r.skipped} skipped` : ""}`),
    });
  }

  return (
    <>
      <PageHeader
        title="Clients"
        description={`${clients.length} client${clients.length > 1 ? "s" : ""} in your book`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload />Import CSV</Button>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={!list.length}><Download />Export CSV</Button>
            <Button onClick={() => openQuick("client")}><Plus />New client</Button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { void onImport(e.target.files?.[0]); e.target.value = ""; }} />
          </>
        }
      />

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <ChipFilter<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "favorites", label: "Favourites", count: counts.favorites },
            { value: "vip", label: "VIP", count: counts.vip },
            { value: "inactive", label: "Inactive", count: counts.inactive },
            { value: "birthdays", label: "Birthdays this month", count: counts.birthdays },
          ]}
        />
        <div className="flex gap-2">
          <SearchInput value={query} onChange={setQuery} placeholder="Name, phone, tag…" className="flex-1 lg:w-64" />
          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger className="w-auto gap-2 rounded-full" aria-label="Sort"><ArrowDownUp className="h-3.5 w-3.5" /><SelectValue /></SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="last_visit">Last visit</SelectItem>
              <SelectItem value="spent">Total spent</SelectItem>
              <SelectItem value="visits">Visits</SelectItem>
              <SelectItem value="recent">Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState
          title={clients.length ? "No client matches" : "Your client book is empty"}
          description={clients.length ? "Try another search or filter." : "Add your first client, or import a CSV from your previous tool."}
          action={!clients.length && <Button onClick={() => openQuick("client")}><Plus />Add a client</Button>}
        />
      ) : (
        <>
          {/* phone & tablet: cards */}
          <div className="grid gap-2.5 sm:grid-cols-2 md:hidden">
            {list.map((c) => (
              <Link key={c.id} href={`/clients/${c.id}`}>
                <Card className="flex items-center gap-3 p-3.5 active:scale-[0.99]">
                  <ClientAvatar client={c} className="h-11 w-11" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate font-medium">
                      {fullName(c)} {c.is_favorite && <Heart className="h-3.5 w-3.5 fill-primary text-primary" />}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {c.stats.last_visit ? `Last visit ${formatDate(c.stats.last_visit, "d MMM")}` : "No visit yet"} · {c.stats.appointments_count} visits
                    </div>
                  </div>
                  <div className="text-right text-sm font-medium tabular">{formatCurrency(c.stats.total_spent, { compact: true })}</div>
                </Card>
              </Link>
            ))}
          </div>

          {/* desktop: table */}
          <Card className="hidden overflow-hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Last visit</TableHead>
                  <TableHead>Next visit</TableHead>
                  <TableHead className="text-right">Visits</TableHead>
                  <TableHead className="text-right">Total spent</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((c, i) => (
                  <motion.tr
                    key={c.id}
                    initial={i < 20 ? { opacity: 0 } : false}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.015 }}
                    className="group border-b border-border/60 transition-colors hover:bg-blush-50/70 dark:hover:bg-muted/50"
                  >
                    <TableCell>
                      <Link href={`/clients/${c.id}`} className="flex items-center gap-3">
                        <ClientAvatar client={c} className="h-9 w-9" />
                        <div className="min-w-0">
                          <div className="font-medium group-hover:text-primary">{fullName(c)}</div>
                          {c.tags?.length > 0 && <div className="truncate text-xs text-muted-foreground">{c.tags.join(" · ")}</div>}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div>{c.phone ?? "—"}</div>
                      {c.instagram && <div className="text-xs">{c.instagram}</div>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(c.stats.last_visit, "d MMM yyyy")}</TableCell>
                    <TableCell>{c.stats.next_visit ? formatDate(c.stats.next_visit, "d MMM, HH:mm") : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-right tabular">{c.stats.appointments_count}</TableCell>
                    <TableCell className="text-right font-medium tabular">{formatCurrency(c.stats.total_spent)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-0.5">
                        <Button variant="ghost" size="icon-sm" aria-label="Favourite" onClick={() => run(() => toggleClientFlag(c.id, "is_favorite", !c.is_favorite))}>
                          <Heart className={c.is_favorite ? "fill-primary text-primary" : "text-muted-foreground"} />
                        </Button>
                        <Button variant="ghost" size="icon-sm" aria-label="VIP" onClick={() => run(() => toggleClientFlag(c.id, "is_vip", !c.is_vip))}>
                          <Crown className={c.is_vip ? "fill-champagne text-[#C9A15B]" : "text-muted-foreground"} />
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </>
  );
}
