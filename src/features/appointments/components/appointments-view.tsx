"use client";

import { useMemo, useState } from "react";
import { isSameDay, isToday, isTomorrow, startOfDay } from "date-fns";
import { Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipFilter } from "@/components/shared/chip-filter";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { downloadFile, toCSV } from "@/lib/csv";
import { formatCurrency, formatDate } from "@/lib/format";
import { fullName, sum } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import type { AppointmentWithRelations } from "@/types/domain";
import { AppointmentRow } from "./appointment-row";

type Tab = "upcoming" | "today" | "pending" | "past" | "cancelled";

export function AppointmentsView({ appointments }: { appointments: AppointmentWithRelations[] }) {
  const openQuick = useUIStore((s) => s.openQuick);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [query, setQuery] = useState("");
  const now = new Date();

  const filters: Record<Tab, (a: AppointmentWithRelations) => boolean> = {
    upcoming: (a) => new Date(a.end_at) >= now && ["pending", "confirmed"].includes(a.status),
    today: (a) => isToday(new Date(a.start_at)),
    pending: (a) => a.status === "pending",
    past: (a) => new Date(a.start_at) < startOfDay(now) && a.status === "completed",
    cancelled: (a) => a.status === "cancelled",
  };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = appointments.filter(filters[tab]).filter((a) =>
      !q || `${fullName(a.client)} ${a.service?.name ?? ""} ${a.notes ?? ""}`.toLowerCase().includes(q));
    return tab === "upcoming" || tab === "today" || tab === "pending" ? rows : [...rows].reverse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointments, tab, query]);

  const groups = useMemo(() => {
    const out: { day: Date; items: AppointmentWithRelations[] }[] = [];
    for (const a of list) {
      const d = new Date(a.start_at);
      const last = out[out.length - 1];
      if (last && isSameDay(last.day, d)) last.items.push(a);
      else out.push({ day: d, items: [a] });
    }
    return out;
  }, [list]);

  const dayLabel = (d: Date) => (isToday(d) ? "Today" : isTomorrow(d) ? "Tomorrow" : formatDate(d, "EEEE d MMMM"));

  return (
    <>
      <PageHeader
        title="Appointments"
        description={`${appointments.filter(filters.upcoming).length} upcoming · ${appointments.filter(filters.pending).length} pending`}
        actions={
          <>
            <Button variant="outline" size="sm" disabled={!list.length} onClick={() => downloadFile(toCSV(list.map((a) => ({
              date: formatDate(a.start_at, "dd/MM/yyyy HH:mm"), client: fullName(a.client), service: a.service?.name ?? "",
              status: a.status, total: a.total_price, payment: a.payment_status, source: a.source,
            }))), `wissnails-appointments-${tab}.csv`)}><Download />Export</Button>
            <Button onClick={() => openQuick("appointment")}><Plus />New appointment</Button>
          </>
        }
      />
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <ChipFilter<Tab>
          value={tab}
          onChange={setTab}
          options={(["upcoming", "today", "pending", "past", "cancelled"] as Tab[]).map((t) => ({
            value: t, label: t[0]!.toUpperCase() + t.slice(1), count: appointments.filter(filters[t]).length,
          }))}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Client, service, note…" />
      </div>

      {groups.length === 0 ? (
        <EmptyState
          title={tab === "upcoming" ? "Nothing booked yet" : "Nothing here"}
          description={tab === "upcoming" ? "New bookings from the dashboard and Calendly will appear here." : "Try another tab or search."}
          action={tab === "upcoming" && <Button onClick={() => openQuick("appointment")}><Plus />Book an appointment</Button>}
        />
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.day.toISOString()}>
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h2 className="font-display text-xl font-semibold capitalize">{dayLabel(g.day)}</h2>
                <span className="text-xs text-muted-foreground tabular">{g.items.length} · {formatCurrency(sum(g.items.filter((a) => a.status !== "cancelled"), (a) => a.total_price))}</span>
              </div>
              <Card className="divide-y divide-border/60 p-2">
                {g.items.map((a) => <AppointmentRow key={a.id} appointment={a} />)}
              </Card>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
