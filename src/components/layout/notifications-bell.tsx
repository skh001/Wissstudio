"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bell, CalendarCheck2, CalendarClock, CalendarX2, Cake, CreditCard, PackageX, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getNotifications, type NotificationItem } from "@/features/notifications/actions";
import { useUIStore } from "@/stores/ui-store";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const ICONS: Record<NotificationItem["kind"], { icon: typeof Bell; cls: string }> = {
  upcoming: { icon: CalendarClock, cls: "bg-blush-100 text-rosegold-600" },
  low_stock: { icon: PackageX, cls: "bg-red-50 text-red-500 dark:bg-red-500/10" },
  birthday: { icon: Cake, cls: "bg-amber-50 text-amber-600 dark:bg-amber-500/10" },
  appointment_cancelled: { icon: CalendarX2, cls: "bg-red-50 text-red-500 dark:bg-red-500/10" },
  appointment_completed: { icon: CalendarCheck2, cls: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" },
  payment_received: { icon: CreditCard, cls: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" },
  activity: { icon: Sparkles, cls: "bg-muted text-muted-foreground" },
};

export function NotificationsBell() {
  const { notificationsSeenAt, markNotificationsSeen } = useUIStore();
  const { data = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await getNotifications();
      return res.ok ? res.data : [];
    },
    refetchInterval: 60_000,
  });

  const seen = notificationsSeenAt ? new Date(notificationsSeenAt).getTime() : 0;
  const unread = data.filter((n) => n.live || new Date(n.at).getTime() > seen).length;
  const urgent = data.some((n) => n.kind === "low_stock");

  return (
    <Popover onOpenChange={(open) => { if (!open) markNotificationsSeen(); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${unread ? ` (${unread} new)` : ""}`}>
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className={cn("absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-semibold text-white", urgent ? "bg-red-500" : "bg-primary")}>
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,380px)] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="font-display text-lg font-semibold">Notifications</span>
          <button onClick={markNotificationsSeen} className="text-xs text-primary hover:underline">Mark all as read</button>
        </div>
        <ScrollArea className="h-[min(65dvh,420px)]">
          {data.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">All quiet for now.</p>
          ) : (
            <ul className="p-2">
              {data.map((n) => {
                const meta = ICONS[n.kind];
                const isNew = n.live || new Date(n.at).getTime() > seen;
                const body = (
                  <div className="flex gap-3 rounded-xl px-2.5 py-2.5 transition hover:bg-accent">
                    <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", meta.cls)}>
                      <meta.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className={cn("text-sm", isNew && "font-medium")}>{n.title}</span>
                        {!n.live && <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(n.at)}</span>}
                      </div>
                      {n.description && <p className="truncate text-xs text-muted-foreground">{n.description}</p>}
                    </div>
                  </div>
                );
                return <li key={n.id}>{n.href ? <Link href={n.href}>{body}</Link> : body}</li>;
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
