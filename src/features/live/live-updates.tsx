"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { autoSyncAction } from "@/features/integrations/actions";
import { announceBooking, primeAlertSounds, type BookingAlertKind } from "./alerts";

interface ActivityRow {
  id: string;
  type: string;
  description: string | null;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string;
  /** Added by the realtime migration: true when written by a webhook / sync, not by the salon in the app. */
  external?: boolean;
}

interface AppointmentSummary {
  start_at: string;
  client: { first_name: string; last_name: string } | null;
  service: { name: string } | null;
}

const ALERT_KIND: Record<string, BookingAlertKind> = { appointment_created: "new", appointment_cancelled: "cancelled" };
const AUTO_SYNC_EVERY_MS = 60_000; // the server decides whether a pull is actually due (5 / 30 min)
const POLL_EVERY_MS = 20_000; // only while Realtime is unavailable
const REFRESH_DEBOUNCE_MS = 400;

/** Bookings that come from Calendly / Google ring; the salon's own changes in the app don't. */
function isExternal(row: ActivityRow) {
  if (typeof row.external === "boolean") return row.external;
  return /\(Calendly\)/.test(row.description ?? ""); // before the realtime migration is applied
}

/** An open dialog or sheet holds a form: refreshing now could reset what is being typed. */
const dialogOpen = () => !!document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]');

/**
 * Keeps every screen live without a page refresh:
 *  • Supabase Realtime (appointments, activity, expenses) → re-render server data + React Query caches;
 *  • external bookings / cancellations → toast in every tab, sound + vibration + system notification in one;
 *  • one tab per browser runs the background Calendly / Google sync (no "Sync" click needed);
 *  • falls back to polling the activity feed if Realtime can't connect.
 */
export function LiveUpdates({ ownerId }: { ownerId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const handled = useRef(new Set<string>());
  const refreshTimer = useRef<number | undefined>(undefined);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  const refreshNow = useCallback(() => {
    if (dialogOpen()) {
      refreshTimer.current = window.setTimeout(refreshNow, 1000); // try again once the dialog closes
      return;
    }
    router.refresh();
    void queryClient.invalidateQueries();
  }, [router, queryClient]);

  const scheduleRefresh = useCallback(() => {
    window.clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(refreshNow, REFRESH_DEBOUNCE_MS);
  }, [refreshNow]);

  const onActivity = useCallback(async (row: ActivityRow) => {
    if (handled.current.has(row.id)) return;
    handled.current.add(row.id);
    scheduleRefresh();

    const kind = ALERT_KIND[row.type];
    if (!kind || !isExternal(row) || row.entity_type !== "appointment" || !row.entity_id) return;
    const { data } = await createClient()
      .from("appointments")
      .select("start_at, client:clients(first_name, last_name), service:services(name)")
      .eq("id", row.entity_id)
      .maybeSingle();
    const appt = data as unknown as AppointmentSummary | null;
    await announceBooking(
      {
        id: row.id,
        kind,
        clientName: appt?.client?.first_name || row.description?.split(" · ")[0] || "A client",
        serviceName: appt?.service?.name ?? null,
        startAt: appt?.start_at ?? null,
        href: `/appointments/${row.entity_id}`,
      },
      { onOpen: (href) => router.push(href) },
    );
  }, [router, scheduleRefresh]);

  useEffect(() => primeAlertSounds(), []);

  // ── Realtime + polling fallback ─────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    let disposed = false;
    let channel: RealtimeChannel | null = null;
    let pollTimer: number | undefined;
    let cursor: string | null = null;

    const advance = (createdAt: string) => { if (!cursor || createdAt > cursor) cursor = createdAt; };

    /** Fetches activity newer than the cursor: catch-up after a disconnect, or the fallback when Realtime is down. */
    const catchUp = async () => {
      if (!cursor) return;
      const { data } = await supabase.from("activity_log").select("*")
        .gt("created_at", cursor).order("created_at", { ascending: true }).limit(25);
      for (const row of (data ?? []) as ActivityRow[]) {
        advance(row.created_at);
        void onActivity(row);
      }
    };
    const startPolling = () => { if (!pollTimer && !disposed) pollTimer = window.setInterval(() => void catchUp(), POLL_EVERY_MS); };
    const stopPolling = () => { window.clearInterval(pollTimer); pollTimer = undefined; };

    void (async () => {
      // Start after the newest existing event: nothing that happened before this page load rings again.
      const { data: latest } = await supabase.from("activity_log").select("created_at")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      cursor = (latest as { created_at: string } | null)?.created_at ?? new Date().toISOString();

      const { data: { session } } = await supabase.auth.getSession();
      if (disposed) return;
      if (session) await supabase.realtime.setAuth(session.access_token); // RLS: only this salon's rows

      const filter = `owner_id=eq.${ownerId}`;
      channel = supabase.channel(`live:${ownerId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log", filter }, (p) => {
          const row = p.new as ActivityRow;
          advance(row.created_at);
          void onActivity(row);
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter }, scheduleRefresh)
        .on("postgres_changes", { event: "*", schema: "public", table: "expenses", filter }, scheduleRefresh)
        .subscribe((status) => {
          if (status === "SUBSCRIBED") { stopPolling(); void catchUp(); }
          else startPolling(); // CHANNEL_ERROR, TIMED_OUT, CLOSED
        });
      // Realtime not enabled for these tables yet (migration not applied) → it never confirms: poll instead.
      window.setTimeout(() => { if (!disposed && channel?.state !== "joined") startPolling(); }, 15_000);
    })();

    const onVisible = () => { if (document.visibilityState === "visible") void catchUp(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      disposed = true;
      stopPolling();
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [ownerId, onActivity, scheduleRefresh]);

  // ── background Calendly / Google sync: one tab per browser ──────
  useEffect(() => {
    const abort = new AbortController();
    let timer: number | undefined;
    let release: (() => void) | undefined;

    const tick = async () => {
      const res = await autoSyncAction().catch(() => null);
      // New bookings arrive through Realtime; this covers the integration status on the Settings page.
      if (res?.ok && res.data.ran && pathRef.current.startsWith("/settings")) scheduleRefresh();
    };
    const lead = () => { void tick(); timer = window.setInterval(() => void tick(), AUTO_SYNC_EVERY_MS); };

    if (navigator.locks) {
      // The tab holding this lock is the leader until it closes; another tab then takes over.
      navigator.locks.request("wissnails-auto-sync", { signal: abort.signal }, () => new Promise<void>((resolve) => {
        release = resolve;
        lead();
      })).catch(() => undefined); // AbortError on unmount
    } else {
      lead();
    }
    return () => {
      abort.abort();
      window.clearInterval(timer);
      release?.();
    };
  }, [scheduleRefresh]);

  useEffect(() => () => window.clearTimeout(refreshTimer.current), []);
  return null;
}
