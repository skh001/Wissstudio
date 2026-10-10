"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import frLocale from "@fullcalendar/core/locales/fr";
import type { DatesSetArg, EventContentArg, EventDropArg } from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { useSalon } from "@/components/layout/salon-context";
import { STATUS_META } from "@/lib/constants";
import { fullName } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import { syncGoogleNow } from "@/features/integrations/actions";
import type { AppointmentWithRelations, OpeningHours } from "@/types/domain";
import { fetchCalendarRange, moveAppointment } from "../actions";

const DAY_INDEX: Record<keyof OpeningHours, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };

export function CalendarView({ googleConnected, calendlyConnected }: { googleConnected: boolean; calendlyConnected: boolean }) {
  const salon = useSalon();
  const router = useRouter();
  const queryClient = useQueryClient();
  const openQuick = useUIStore((s) => s.openQuick);
  const calRef = useRef<FullCalendar>(null);
  const [range, setRange] = useState<{ start: string; end: string } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const isPhone = typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;

  const { data: appointments = [], isFetching } = useQuery({
    queryKey: ["calendar", range?.start, range?.end],
    queryFn: async () => {
      const res = await fetchCalendarRange(range!.start, range!.end);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    enabled: !!range,
    placeholderData: (prev) => prev,
    refetchInterval: 60_000, // picks up Calendly bookings arriving through the webhook
  });

  const events = useMemo(() => appointments.map((a: AppointmentWithRelations) => {
    const meta = STATUS_META[a.status];
    return {
      id: a.id,
      title: `${fullName(a.client)}${a.service ? ` · ${a.service.name}` : ""}`,
      start: a.start_at,
      end: a.end_at,
      backgroundColor: meta.color,
      textColor: meta.text,
      editable: a.status === "pending" || a.status === "confirmed",
      classNames: a.status === "cancelled" ? ["opacity-60", "line-through"] : [],
      extendedProps: { appointment: a },
    };
  }), [appointments]);

  const businessHours = useMemo(() =>
    (Object.entries(salon.opening_hours) as [keyof OpeningHours, OpeningHours["mon"]][])
      .filter(([, d]) => !d.closed)
      .map(([day, d]) => ({ daysOfWeek: [DAY_INDEX[day]], startTime: d.open, endTime: d.close })),
  [salon.opening_hours]);

  async function persistMove(info: EventDropArg | EventResizeDoneArg) {
    const { event } = info;
    if (!event.start || !event.end) return info.revert();
    const res = await moveAppointment(event.id, event.start.toISOString(), event.end.toISOString());
    if (!res.ok) { toast.error(res.error); info.revert(); return; }
    toast.success("Appointment moved", { description: "Google Calendar is updated too." });
    void queryClient.invalidateQueries({ queryKey: ["calendar"] });
    router.refresh();
  }

  function renderEvent(arg: EventContentArg) {
    const a = arg.event.extendedProps.appointment as AppointmentWithRelations;
    const isList = arg.view.type.startsWith("list");
    if (isList) return <span>{arg.event.title}</span>;
    return (
      <div className="overflow-hidden px-1 py-0.5 leading-tight">
        <div className="truncate font-semibold">{arg.timeText}</div>
        <div className="truncate">{fullName(a.client)}</div>
        {a.service && <div className="truncate opacity-80">{a.service.name}</div>}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Calendar"
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {(Object.keys(STATUS_META) as (keyof typeof STATUS_META)[]).map((s) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_META[s].color }} />{STATUS_META[s].label}
              </span>
            ))}
          </span>
        }
        actions={
          <>
            {googleConnected && (
              <Button variant="outline" size="sm" loading={syncing} onClick={async () => {
                setSyncing(true);
                const res = await syncGoogleNow();
                setSyncing(false);
                if (!res.ok) return toast.error(res.error);
                toast.success(res.data.changed ? `${res.data.changed} change${res.data.changed > 1 ? "s" : ""} from Google` : "Already up to date");
                void queryClient.invalidateQueries({ queryKey: ["calendar"] });
              }}>
                {!syncing && <RefreshCw />}Sync Google
              </Button>
            )}
            <Button onClick={() => openQuick("appointment")}><Plus />New appointment</Button>
          </>
        }
      />
      {!googleConnected && !calendlyConnected && (
        <p className="-mt-3 mb-4 text-xs text-muted-foreground">
          Connect Google Calendar and Calendly in Settings → Integrations to sync bookings both ways.
        </p>
      )}
      <Card className="relative p-3 sm:p-5">
        {isFetching && <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden rounded-t-2xl"><div className="h-full w-1/3 animate-shimmer bg-primary" /></div>}
        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          locale={salon.language === "fr" ? frLocale : undefined}
          firstDay={1}
          initialView={isPhone ? "timeGridDay" : "timeGridWeek"}
          headerToolbar={isPhone
            ? { left: "prev,next", center: "title", right: "today" }
            : { left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek" }}
          footerToolbar={isPhone ? { center: "dayGridMonth,timeGridWeek,timeGridDay,listWeek" } : undefined}
          buttonText={{ today: "Today", month: "Month", week: "Week", day: "Day", list: "Agenda" }}
          height="auto"
          expandRows
          nowIndicator
          slotMinTime="07:00:00"
          slotMaxTime="21:00:00"
          slotDuration="00:30:00"
          snapDuration="00:15:00"
          allDaySlot={false}
          businessHours={businessHours}
          editable
          selectable
          selectMirror
          eventDurationEditable
          dayMaxEvents={3}
          events={events}
          eventContent={renderEvent}
          datesSet={(arg: DatesSetArg) => setRange({ start: arg.start.toISOString(), end: arg.end.toISOString() })}
          eventDrop={persistMove}
          eventResize={persistMove}
          eventClick={(info) => router.push(`/appointments/${info.event.id}`)}
          select={(info) => {
            openQuick("appointment", { start: info.start.toISOString() });
            calRef.current?.getApi().unselect();
          }}
          dateClick={(info) => {
            if (info.view.type === "dayGridMonth") {
              const d = new Date(info.date);
              d.setHours(10, 0, 0, 0);
              openQuick("appointment", { start: d.toISOString() });
            }
          }}
          noEventsContent="No appointments in this period"
        />
      </Card>
    </>
  );
}
