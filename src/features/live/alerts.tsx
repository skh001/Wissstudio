"use client";

import { isToday, isTomorrow } from "date-fns";
import { toast } from "sonner";
import { formatDate, formatTime } from "@/lib/format";
import { useUIStore } from "@/stores/ui-store";

export type BookingAlertKind = "new" | "cancelled";

export interface BookingAlert {
  /** Unique per event (activity row id): used so the sound plays once across tabs and refreshes. */
  id: string;
  kind: BookingAlertKind;
  clientName: string;
  serviceName: string | null;
  startAt: string | null;
  href: string | null;
}

const SOUNDS: Record<BookingAlertKind, string> = { new: "/sounds/new-booking.mp3", cancelled: "/sounds/cancel.mp3" };
const VIBRATION: Record<BookingAlertKind, number[]> = { new: [90, 60, 90], cancelled: [220] };
const CLAIMS_KEY = "wissnails-alerted";
const CLAIM_LOCK = "wissnails-alert-claim";

// ── one tab per alert ─────────────────────────────────────────────
const channel = typeof window !== "undefined" && "BroadcastChannel" in window ? new BroadcastChannel("wissnails-alerts") : null;
const claimedHere = new Set<string>();
channel?.addEventListener("message", (e: MessageEvent<{ type: string; id: string }>) => {
  if (e.data?.type === "claimed") claimedHere.add(e.data.id);
});

function readClaims(): string[] {
  try { return JSON.parse(localStorage.getItem(CLAIMS_KEY) ?? "[]") as string[]; } catch { return []; }
}
function writeClaims(ids: string[]) {
  try { localStorage.setItem(CLAIMS_KEY, JSON.stringify(ids.slice(-200))); } catch { /* private mode: BroadcastChannel still dedupes */ }
}

/**
 * Returns true in exactly one tab for a given alert. Web Locks make check-and-mark atomic across tabs;
 * the list lives in localStorage so a page refresh never rings again for the same event.
 * Without Web Locks (old browsers), a random delay + BroadcastChannel does the same job.
 */
async function claimAlert(id: string): Promise<boolean> {
  const tryClaim = () => {
    if (claimedHere.has(id) || readClaims().includes(id)) return false;
    writeClaims([...readClaims(), id]);
    claimedHere.add(id);
    channel?.postMessage({ type: "claimed", id });
    return true;
  };
  if (navigator.locks) return navigator.locks.request(CLAIM_LOCK, async () => tryClaim());
  await new Promise((r) => setTimeout(r, Math.random() * 250));
  return tryClaim();
}

// ── sound ─────────────────────────────────────────────────────────
const audio: Partial<Record<BookingAlertKind, HTMLAudioElement>> = {};
function getAudio(kind: BookingAlertKind) {
  audio[kind] ??= Object.assign(new Audio(SOUNDS[kind]), { preload: "auto", volume: 0.85 });
  return audio[kind]!;
}

/**
 * Browsers only let a page play sound after the user has interacted with it. On the first tap/click we
 * play both sounds muted once, which unlocks them for later (needed on iPhone).
 */
export function primeAlertSounds() {
  const unlock = () => {
    (Object.keys(SOUNDS) as BookingAlertKind[]).forEach((k) => {
      const a = getAudio(k);
      a.muted = true;
      a.play().then(() => { a.pause(); a.currentTime = 0; a.muted = false; }).catch(() => { a.muted = false; });
    });
  };
  window.addEventListener("pointerdown", unlock, { once: true, capture: true });
  window.addEventListener("keydown", unlock, { once: true, capture: true });
  return () => {
    window.removeEventListener("pointerdown", unlock, { capture: true });
    window.removeEventListener("keydown", unlock, { capture: true });
  };
}

function ring(kind: BookingAlertKind) {
  const a = getAudio(kind);
  a.muted = false;
  a.currentTime = 0;
  void a.play().catch(() => undefined); // blocked until the first interaction: the toast still shows
  if ("vibrate" in navigator) navigator.vibrate(VIBRATION[kind]);
}

// ── system notification ───────────────────────────────────────────
async function systemNotify(title: string, body: string, alert: BookingAlert) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const options: NotificationOptions = {
    body, tag: alert.id, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", data: { url: alert.href ?? "/dashboard" },
  };
  try {
    // Phones only show notifications through the service worker (registered in production).
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg) return void (await reg.showNotification(title, options));
    const n = new Notification(title, options);
    n.onclick = () => { window.focus(); if (alert.href) window.location.assign(alert.href); n.close(); };
  } catch { /* unsupported context: the toast is enough */ }
}

// ── public API ────────────────────────────────────────────────────
export function describeWhen(startAt: string | null) {
  if (!startAt) return null;
  const d = new Date(startAt);
  const day = isToday(d) ? "Today" : isTomorrow(d) ? "Tomorrow" : formatDate(d, "EEE d MMM");
  return `${day} - ${formatTime(d)}`;
}

/**
 * Shows the toast in every tab; sound, vibration and the system notification happen once (one tab).
 * `test` skips the once-only rule and always shows the system notification so the user can try it.
 */
export async function announceBooking(alert: BookingAlert, opts: { onOpen?: (href: string) => void; test?: boolean } = {}) {
  const title = alert.kind === "new" ? "🎉 New Appointment!" : "❌ Appointment Cancelled";
  const when = describeWhen(alert.startAt);
  const lines = alert.kind === "new"
    ? [`${alert.clientName} booked:`, alert.serviceName ?? "Appointment", when]
    : [alert.clientName, alert.serviceName, when];
  const body = lines.filter(Boolean).join("\n");

  toast(title, {
    id: `alert-${alert.id}`,
    description: <span className="whitespace-pre-line">{body}</span>,
    duration: 12_000,
    action: alert.href && opts.onOpen ? { label: "View", onClick: () => opts.onOpen!(alert.href!) } : undefined,
  });

  if (!opts.test && !(await claimAlert(alert.id))) return;
  const { soundEnabled, browserNotifications } = useUIStore.getState();
  if (soundEnabled) ring(alert.kind);
  if (browserNotifications && (opts.test || document.visibilityState !== "visible")) await systemNotify(title, body, alert);
}
