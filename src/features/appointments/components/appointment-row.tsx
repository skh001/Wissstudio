import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { ClientAvatar } from "@/components/shared/client-avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate, formatTime } from "@/lib/format";
import { cn, fullName } from "@/lib/utils";
import type { AppointmentWithRelations } from "@/types/domain";

export function AppointmentRow({ appointment: a, showClient = true, className }: { appointment: AppointmentWithRelations; showClient?: boolean; className?: string }) {
  return (
    <Link href={`/appointments/${a.id}`} className={cn("flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-accent/60", className)}>
      <div className="w-14 shrink-0 text-center leading-tight">
        <div className="text-[11px] uppercase text-muted-foreground">{formatDate(a.start_at, "MMM")}</div>
        <div className="font-display text-2xl font-semibold">{formatDate(a.start_at, "d")}</div>
      </div>
      <span className="h-10 w-1 shrink-0 rounded-full" style={{ background: a.service?.color ?? "#F4A6C6" }} />
      {showClient && <ClientAvatar client={a.client} className="h-9 w-9" />}
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{showClient ? fullName(a.client) : a.service?.name ?? "Appointment"}</div>
        <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
          <CalendarClock className="h-3 w-3" />
          {formatDate(a.start_at, "EEE")} {formatTime(a.start_at)}{showClient && a.service ? ` · ${a.service.name}` : ""}
        </div>
      </div>
      <div className="hidden text-right text-sm font-medium tabular sm:block">{formatCurrency(a.total_price)}</div>
      <StatusBadge status={a.status} />
    </Link>
  );
}
