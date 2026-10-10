"use server";

import { addDays, addHours, format } from "date-fns";
import { requireUser, runAction } from "@/lib/action";
import { fullName } from "@/lib/utils";

export interface NotificationItem {
  id: string;
  kind: "upcoming" | "low_stock" | "birthday" | "appointment_cancelled" | "appointment_completed" | "payment_received" | "activity";
  title: string;
  description: string | null;
  href: string | null;
  at: string;
  live?: boolean; // derived from current state, not from the log
}

export async function getNotifications() {
  return runAction(async (): Promise<NotificationItem[]> => {
    const { supabase } = await requireUser();
    const now = new Date();
    const [activity, upcoming, products, clients] = await Promise.all([
      supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("appointments")
        .select("id, start_at, client:clients(first_name, last_name), service:services(name)")
        .in("status", ["confirmed", "pending"])
        .gte("start_at", now.toISOString()).lt("start_at", addHours(now, 3).toISOString()).order("start_at"),
      supabase.from("products").select("id, name, quantity, min_quantity, unit"),
      supabase.from("clients").select("id, first_name, last_name, birthday").not("birthday", "is", null),
    ]);

    const items: NotificationItem[] = [];

    for (const a of (upcoming.data ?? []) as unknown as { id: string; start_at: string; client: { first_name: string; last_name: string } | null; service: { name: string } | null }[]) {
      items.push({
        id: `up-${a.id}`, kind: "upcoming", live: true,
        title: `Upcoming at ${format(new Date(a.start_at), "HH:mm")}`,
        description: `${fullName(a.client)} · ${a.service?.name ?? "Appointment"}`,
        href: `/appointments/${a.id}`, at: a.start_at,
      });
    }

    const low = (products.data ?? []).filter((p) => Number(p.quantity) <= Number(p.min_quantity));
    if (low.length) {
      items.push({
        id: "low-stock", kind: "low_stock", live: true,
        title: `${low.length} product${low.length > 1 ? "s" : ""} running low`,
        description: low.slice(0, 3).map((p) => p.name).join(", ") + (low.length > 3 ? "…" : ""),
        href: "/stock?filter=low", at: now.toISOString(),
      });
    }

    const weekKeys = new Set(Array.from({ length: 7 }, (_, i) => format(addDays(now, i), "MM-dd")));
    for (const c of clients.data ?? []) {
      const key = String(c.birthday).slice(5, 10);
      if (!weekKeys.has(key)) continue;
      const isToday = key === format(now, "MM-dd");
      items.push({
        id: `bd-${c.id}`, kind: "birthday", live: true,
        title: isToday ? `🎂 ${c.first_name}'s birthday is today` : `🎂 ${c.first_name}'s birthday on ${format(new Date(`2000-${key}`), "d MMM")}`,
        description: "Send a little message or a birthday offer.",
        href: `/clients/${c.id}`, at: now.toISOString(),
      });
    }

    for (const a of activity.data ?? []) {
      const kind = (["appointment_cancelled", "appointment_completed", "payment_received", "low_stock"].includes(a.type) ? a.type : "activity") as NotificationItem["kind"];
      items.push({
        id: a.id, kind, title: a.title, description: a.description,
        href: a.entity_type === "appointment" ? `/appointments/${a.entity_id}`
          : a.entity_type === "client" ? `/clients/${a.entity_id}`
          : a.entity_type === "product" ? "/stock"
          : a.entity_type === "review" ? "/reviews" : null,
        at: a.created_at,
      });
    }
    return items;
  });
}
