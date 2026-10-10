import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/site-url";
import type { AppointmentStatus } from "@/types/domain";

/**
 * Google Calendar two-way sync (REST, no SDK).
 *  push: every dashboard appointment create/update/cancel → event upsert/delete
 *  pull: incremental sync with syncToken (cron every 15 min + push-notification webhook)
 *        → moves/deletions made in Google update the dashboard.
 */
const API = "https://www.googleapis.com/calendar/v3";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

// Google colorIds: 4 Flamingo, 5 Banana, 10 Basil, 11 Tomato
const STATUS_COLOR: Record<AppointmentStatus, string> = { confirmed: "4", pending: "5", completed: "10", cancelled: "11" };

type GoogleSettings = {
  calendar_id?: string;
  sync_token?: string;
  import_external?: boolean;
  channel_id?: string;
  resource_id?: string;
  channel_expiration?: number;
};

interface GoogleEvent {
  id: string;
  status: "confirmed" | "tentative" | "cancelled";
  summary?: string;
  description?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  extendedProperties?: { private?: Record<string, string> };
}

export const googleConfigured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export function googleAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${siteUrl()}/api/integrations/google/callback`,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: "openid email https://www.googleapis.com/auth/calendar.events",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleCode(code: string) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${siteUrl()}/api/integrations/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status})`);
  const json = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number; id_token?: string };
  let email: string | null = null;
  if (json.id_token) {
    try {
      const payload = JSON.parse(Buffer.from(json.id_token.split(".")[1]!, "base64url").toString());
      email = payload.email ?? null;
    } catch { /* ignore */ }
  }
  return { ...json, email };
}

async function getIntegration(ownerId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("integrations").select("*").eq("owner_id", ownerId).eq("provider", "google").maybeSingle();
  return data as null | { access_token: string; refresh_token: string | null; expires_at: string | null; settings: GoogleSettings };
}

async function accessToken(ownerId: string): Promise<{ token: string; settings: GoogleSettings } | null> {
  const integ = await getIntegration(ownerId);
  if (!integ) return null;
  const expiresAt = integ.expires_at ? new Date(integ.expires_at).getTime() : 0;
  if (expiresAt - 60_000 > Date.now()) return { token: integ.access_token, settings: integ.settings ?? {} };
  if (!integ.refresh_token) return null;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: integ.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    console.error("[google] refresh failed", res.status, await res.text());
    return null;
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  await createAdminClient()
    .from("integrations")
    .update({ access_token: json.access_token, expires_at: new Date(Date.now() + json.expires_in * 1000).toISOString() })
    .eq("owner_id", ownerId)
    .eq("provider", "google");
  return { token: json.access_token, settings: integ.settings ?? {} };
}

async function gfetch(token: string, path: string, init: RequestInit = {}) {
  return fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
  });
}

/** Push one appointment to Google (create, update or delete). Never throws. */
export async function syncAppointmentToGoogle(ownerId: string, appointmentId: string) {
  if (!googleConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  try {
    const auth = await accessToken(ownerId);
    if (!auth) return;
    const admin = createAdminClient();
    const { data: a } = await admin
      .from("appointments")
      .select("*, client:clients(first_name, last_name, phone), service:services(name)")
      .eq("id", appointmentId)
      .eq("owner_id", ownerId)
      .maybeSingle();
    const calendarId = encodeURIComponent(auth.settings.calendar_id ?? "primary");

    // Calendly already writes its own events to Google: never duplicate them.
    if (!a || a.source === "calendly") return;

    if (a.status === "cancelled") {
      if (a.google_event_id) {
        await gfetch(auth.token, `/calendars/${calendarId}/events/${a.google_event_id}`, { method: "DELETE" });
        await admin.from("appointments").update({ google_event_id: null }).eq("id", a.id);
      }
      return;
    }

    const clientName = a.client ? `${a.client.first_name} ${a.client.last_name ?? ""}`.trim() : "Client";
    const body = {
      summary: `💅 ${a.service?.name ?? "Rendez-vous"} · ${clientName}`,
      description: [a.client?.phone && `📞 ${a.client.phone}`, a.notes, `Total : ${a.total_price} €`].filter(Boolean).join("\n"),
      start: { dateTime: a.start_at },
      end: { dateTime: a.end_at },
      colorId: STATUS_COLOR[a.status as AppointmentStatus],
      extendedProperties: { private: { wissnails_id: a.id } },
    };

    if (a.google_event_id) {
      const res = await gfetch(auth.token, `/calendars/${calendarId}/events/${a.google_event_id}`, { method: "PATCH", body: JSON.stringify(body) });
      if (res.status !== 404 && res.status !== 410) return;
    }
    const res = await gfetch(auth.token, `/calendars/${calendarId}/events`, { method: "POST", body: JSON.stringify(body) });
    if (res.ok) {
      const ev = (await res.json()) as GoogleEvent;
      await admin.from("appointments").update({ google_event_id: ev.id }).eq("id", a.id);
    }
  } catch (e) {
    console.error("[google] push failed", e);
  }
}

/** Incremental pull from Google. Returns number of appointments changed. */
export async function pullGoogleChanges(ownerId: string): Promise<number> {
  const auth = await accessToken(ownerId);
  if (!auth) return 0;
  const admin = createAdminClient();
  const calendarId = encodeURIComponent(auth.settings.calendar_id ?? "primary");
  let changed = 0;
  let pageToken: string | undefined;
  let syncToken = auth.settings.sync_token;
  let nextSyncToken: string | undefined;

  while (true) {
    const params = new URLSearchParams({ singleEvents: "true", maxResults: "250", showDeleted: "true" });
    if (pageToken) params.set("pageToken", pageToken);
    if (syncToken) params.set("syncToken", syncToken);
    else params.set("timeMin", new Date(Date.now() - 7 * 86400_000).toISOString());

    const res = await gfetch(auth.token, `/calendars/${calendarId}/events?${params}`);
    if (res.status === 410 && syncToken) {
      // sync token expired → restart a full sync from the first page
      syncToken = undefined;
      pageToken = undefined;
      nextSyncToken = undefined;
      continue;
    }
    if (!res.ok) throw new Error(`Google list failed (${res.status})`);
    const page = (await res.json()) as { items: GoogleEvent[]; nextPageToken?: string; nextSyncToken?: string };

    for (const ev of page.items ?? []) {
      const ownId = ev.extendedProperties?.private?.wissnails_id;
      const start = ev.start?.dateTime;
      const end = ev.end?.dateTime;

      if (ownId) {
        if (ev.status === "cancelled") {
          const { data } = await admin.from("appointments")
            .update({ status: "cancelled", cancelled_at: new Date().toISOString(), google_event_id: null })
            .eq("id", ownId).eq("owner_id", ownerId).in("status", ["pending", "confirmed"]).select("id");
          changed += data?.length ?? 0;
        } else if (start && end) {
          const { data } = await admin.from("appointments")
            .update({ start_at: start, end_at: end })
            .eq("id", ownId).eq("owner_id", ownerId)
            .or(`start_at.neq.${start},end_at.neq.${end}`)
            .select("id");
          changed += data?.length ?? 0;
        }
        continue;
      }

      // Events created directly in Google (opt-in). Calendly events are skipped: the webhook handles them.
      if (!auth.settings.import_external || !start || !end) continue;
      if (/calendly/i.test(`${ev.description ?? ""} ${ev.summary ?? ""}`)) continue;
      if (ev.status === "cancelled") {
        const { data } = await admin.from("appointments")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
          .eq("owner_id", ownerId).eq("google_event_id", ev.id).neq("status", "cancelled").select("id");
        changed += data?.length ?? 0;
        continue;
      }
      const { data } = await admin.from("appointments").upsert(
        { owner_id: ownerId, google_event_id: ev.id, start_at: start, end_at: end, status: "pending", source: "google", notes: ev.summary ?? "Google Calendar" },
        { onConflict: "owner_id,google_event_id", ignoreDuplicates: false },
      ).select("id");
      changed += data?.length ?? 0;
    }
    pageToken = page.nextPageToken;
    nextSyncToken = page.nextSyncToken ?? nextSyncToken;
    if (!pageToken) break;
  }

  if (nextSyncToken && nextSyncToken !== auth.settings.sync_token) {
    await admin.from("integrations")
      .update({ settings: { ...auth.settings, sync_token: nextSyncToken } })
      .eq("owner_id", ownerId).eq("provider", "google");
  }
  return changed;
}

/** Stops the push-notification channel so Google no longer calls the webhook. Never throws. */
export async function stopGoogleWatch(ownerId: string) {
  try {
    const integ = await getIntegration(ownerId);
    if (!integ?.settings?.channel_id || !integ.settings.resource_id) return;
    const auth = await accessToken(ownerId);
    if (!auth) return;
    await gfetch(auth.token, "/channels/stop", {
      method: "POST",
      body: JSON.stringify({ id: integ.settings.channel_id, resourceId: integ.settings.resource_id }),
    });
  } catch (e) {
    console.error("[google] stop watch failed", e);
  }
}

/** Ask Google to notify /api/webhooks/google on changes (needs a public HTTPS URL). */
export async function registerGoogleWatch(ownerId: string) {
  const site = siteUrl();
  if (!site.startsWith("https://")) return;
  const auth = await accessToken(ownerId);
  if (!auth) return;
  const calendarId = encodeURIComponent(auth.settings.calendar_id ?? "primary");
  const channelId = crypto.randomUUID();
  const res = await gfetch(auth.token, `/calendars/${calendarId}/events/watch`, {
    method: "POST",
    body: JSON.stringify({ id: channelId, type: "web_hook", address: `${site}/api/webhooks/google`, token: ownerId }),
  });
  if (!res.ok) return console.error("[google] watch failed", res.status, await res.text());
  const ch = (await res.json()) as { resourceId: string; expiration: string };
  await createAdminClient().from("integrations").update({
    settings: { ...auth.settings, channel_id: channelId, resource_id: ch.resourceId, channel_expiration: Number(ch.expiration) },
  }).eq("owner_id", ownerId).eq("provider", "google");
}
