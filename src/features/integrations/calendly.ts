import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/site-url";
import { patchIntegrationSettings } from "./settings-store";

/**
 * Calendly integration (personal access token).
 *  Calendly → dashboard, three paths that all end in `applyBooking` (idempotent, keyed by the event URI):
 *    1. webhook (invitee.created / invitee.canceled) — instant, needs HTTPS + a paid Calendly plan
 *    2. the embedded widget on /booking reports the new booking → imported immediately through the API
 *    3. polling (`pullCalendlyEvents`) from the cron and the "Sync now" button — works on every plan
 *  Dashboard → Calendly: cancelling a Calendly booking cancels it in Calendly.
 *  New dashboard appointments block Calendly availability through Google Calendar
 *  (Calendly checks the connected Google calendar for conflicts) — Calendly has no API to insert bookings.
 *  Calendly writes its own events to Google, so Calendly appointments are never pushed to Google from here.
 */
const API = "https://api.calendly.com";
const EVENT_PREFIX = `${API}/scheduled_events/`;

interface CalendlySettings {
  user_uri: string;
  org_uri: string;
  webhook_uri?: string;
  webhook_error?: string;
  signing_key: string;
  /** "active" | "disabled" (Calendly disables a webhook after repeated delivery failures) | "missing" */
  webhook_state?: string;
  webhook_checked_at?: string;
  last_webhook_at?: string;
  last_pull_at?: string;
  last_sync_error?: string | null;
}

/** Polling interval: tight when the webhook can't deliver, a light safety net when it can. */
export const CALENDLY_POLL_MS = { withoutWebhook: 5 * 60_000, withWebhook: 30 * 60_000 } as const;
const WEBHOOK_CHECK_MS = 60 * 60_000;

interface CalendlyIntegration {
  access_token: string;
  settings: CalendlySettings;
}

interface CalendlyEvent {
  uri: string;
  name: string;
  status: "active" | "canceled";
  start_time: string;
  end_time: string;
}

interface CalendlyInvitee {
  uri: string;
  email: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  status?: "active" | "canceled";
  text_reminder_number?: string | null;
  rescheduled?: boolean;
  questions_and_answers?: { question: string; answer: string }[];
}

interface InviteePayload extends CalendlyInvitee {
  scheduled_event: CalendlyEvent;
}

type BookingResult = "created" | "updated" | "cancelled" | "unchanged";

async function cfetch(token: string, path: string, init: RequestInit = {}) {
  const url = path.startsWith("http") ? path : `${API}${path}`;
  return fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    cache: "no-store",
  });
}

async function cjson<T>(token: string, path: string): Promise<T> {
  const res = await cfetch(token, path);
  if (!res.ok) throw new Error(`Calendly returned ${res.status} for ${path.replace(API, "")}`);
  return (await res.json()) as T;
}

const webhookUrl = (ownerId: string) => `${siteUrl()}/api/webhooks/calendly?owner=${ownerId}`;

/** Removes subscriptions already pointing at this app: their signing key is lost, so they could never be verified again. */
async function removeOurWebhooks(token: string, orgUri: string, userUri: string, callbackUrl: string) {
  const params = new URLSearchParams({ organization: orgUri, user: userUri, scope: "user", count: "100" });
  const res = await cfetch(token, `/webhook_subscriptions?${params}`);
  if (!res.ok) return;
  const { collection } = (await res.json()) as { collection: { uri: string; callback_url: string }[] };
  for (const w of collection ?? []) {
    if (w.callback_url === callbackUrl) await cfetch(token, w.uri, { method: "DELETE" });
  }
}

export async function connectCalendly(ownerId: string, token: string) {
  const me = await cfetch(token, "/users/me");
  if (!me.ok) throw new Error("Calendly rejected this token. Create a personal access token in Calendly → Integrations → API & Webhooks.");
  const { resource } = (await me.json()) as { resource: { uri: string; email: string; current_organization: string } };

  const signingKey = randomBytes(24).toString("hex");
  const callbackUrl = webhookUrl(ownerId);
  let webhookUri: string | undefined;
  let webhookError: string | undefined;

  if (callbackUrl.startsWith("https://")) {
    await removeOurWebhooks(token, resource.current_organization, resource.uri, callbackUrl);
    const res = await cfetch(token, "/webhook_subscriptions", {
      method: "POST",
      body: JSON.stringify({
        url: callbackUrl,
        events: ["invitee.created", "invitee.canceled"],
        organization: resource.current_organization,
        user: resource.uri,
        scope: "user",
        signing_key: signingKey,
      }),
    });
    if (res.ok) webhookUri = ((await res.json()) as { resource: { uri: string } }).resource.uri;
    else webhookError = res.status === 403
      ? "Instant sync needs a paid Calendly plan (Standard or above)."
      : `Calendly refused the webhook (${res.status}).`;
  } else {
    webhookError = "Instant sync needs the app online over HTTPS.";
  }

  const { error } = await createAdminClient().from("integrations").upsert({
    owner_id: ownerId,
    provider: "calendly",
    access_token: token,
    account_email: resource.email,
    settings: {
      user_uri: resource.uri,
      org_uri: resource.current_organization,
      webhook_uri: webhookUri,
      webhook_error: webhookError,
      webhook_state: webhookUri ? "active" : undefined,
      webhook_checked_at: webhookUri ? new Date().toISOString() : undefined,
      signing_key: signingKey,
    } satisfies CalendlySettings,
    connected_at: new Date().toISOString(),
  });
  if (error) throw new Error(`The Calendly connection couldn't be saved: ${error.message}`);

  // Bring in the bookings that already exist.
  const imported = await pullCalendlyEvents(ownerId).catch((e) => {
    console.error("[calendly] initial pull failed", e);
    return 0;
  });
  return { email: resource.email, webhook: !!webhookUri, webhookError: webhookError ?? null, imported };
}

async function getIntegration(ownerId: string) {
  const { data } = await createAdminClient()
    .from("integrations").select("access_token, settings").eq("owner_id", ownerId).eq("provider", "calendly").maybeSingle();
  return data as CalendlyIntegration | null;
}

export async function disconnectCalendlyWebhook(ownerId: string) {
  const integ = await getIntegration(ownerId);
  if (integ?.settings.webhook_uri) await cfetch(integ.access_token, integ.settings.webhook_uri, { method: "DELETE" }).catch(() => null);
}

/** Verifies the `Calendly-Webhook-Signature: t=…,v1=…` header (HMAC-SHA256 of "t.body"). */
export function verifyCalendlySignature(header: string | null, body: string, key: string) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]));
  if (!parts.t || !parts.v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > 60 * 5) return false; // 5 min tolerance
  const expected = createHmac("sha256", key).update(`${parts.t}.${body}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(parts.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, "\\$&");
const isUniqueViolation = (e: { code?: string } | null) => e?.code === "23505";

async function findClientByEmail(admin: SupabaseClient, ownerId: string, email: string) {
  const { data } = await admin.from("clients").select("id").eq("owner_id", ownerId).ilike("email", escapeLike(email)).limit(1);
  return (data?.[0]?.id as string | undefined) ?? null;
}

/** Finds the client by email, or creates her. Safe when two deliveries of the same booking race. */
async function findOrCreateClient(admin: SupabaseClient, ownerId: string, invitee: CalendlyInvitee) {
  const email = invitee.email?.trim().toLowerCase() || null;
  if (email) {
    const existing = await findClientByEmail(admin, ownerId, email);
    if (existing) return existing;
  }
  const [first, ...rest] = (invitee.name ?? "").trim().split(/\s+/);
  const { data, error } = await admin.from("clients").insert({
    owner_id: ownerId,
    first_name: invitee.first_name || first || "Client",
    last_name: invitee.last_name || rest.join(" "),
    email,
    phone: invitee.text_reminder_number ?? null,
    tags: ["calendly"],
  }).select("id").single();
  if (data) return data.id as string;
  if (email && isUniqueViolation(error)) return findClientByEmail(admin, ownerId, email);
  throw new Error(error?.message ?? "The client couldn't be created.");
}

/** Matches the Calendly event type name to a service (event types should be named like the services). */
async function matchService(admin: SupabaseClient, ownerId: string, event: CalendlyEvent) {
  const { data: services } = await admin.from("services").select("id, name, price, duration_minutes").eq("owner_id", ownerId);
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const eventName = norm(event.name);
  const minutes = (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / 60000;
  return services?.find((s) => norm(s.name) === eventName)
    ?? services?.find((s) => eventName.includes(norm(s.name)) || norm(s.name).includes(eventName))
    ?? services?.find((s) => s.duration_minutes === minutes)
    ?? null;
}

/**
 * Brings one Calendly booking into the dashboard. Idempotent: the event URI is the unique key, so a
 * booking delivered by the webhook, the widget and the poller still produces exactly one appointment.
 * `getInvitee` is only called when the appointment has to be created.
 */
async function applyBooking(
  ownerId: string,
  event: CalendlyEvent,
  canceled: boolean,
  getInvitee: () => Promise<CalendlyInvitee | null>,
  rescheduled = false,
): Promise<BookingResult> {
  const admin = createAdminClient();
  const { data: existing } = await admin.from("appointments")
    .select("id, status, start_at, end_at, notes")
    .eq("owner_id", ownerId).eq("calendly_event_uri", event.uri).maybeSingle();
  const open = existing && (existing.status === "pending" || existing.status === "confirmed");

  if (canceled) {
    if (!open) return "unchanged";
    const note = rescheduled ? "Rescheduled on Calendly" : "Cancelled on Calendly";
    await admin.from("appointments")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString(), notes: [existing.notes, note].filter(Boolean).join("\n") })
      .eq("id", existing.id);
    return "cancelled";
  }

  if (existing) {
    const moved = new Date(existing.start_at).getTime() !== new Date(event.start_time).getTime()
      || new Date(existing.end_at).getTime() !== new Date(event.end_time).getTime();
    if (!open || !moved) return "unchanged";
    await admin.from("appointments").update({ start_at: event.start_time, end_at: event.end_time }).eq("id", existing.id);
    return "updated";
  }

  const invitee = await getInvitee();
  if (!invitee || invitee.status === "canceled") return "unchanged";

  const [clientId, service] = await Promise.all([findOrCreateClient(admin, ownerId, invitee), matchService(admin, ownerId, event)]);
  const answers = (invitee.questions_and_answers ?? []).map((q) => `${q.question} : ${q.answer}`).join("\n");
  const price = Number(service?.price ?? 0);

  const { error } = await admin.from("appointments").insert({
    owner_id: ownerId,
    client_id: clientId,
    service_id: service?.id ?? null,
    start_at: event.start_time,
    end_at: event.end_time,
    status: "confirmed",
    service_price: price,
    total_price: price,
    source: "calendly",
    calendly_event_uri: event.uri,
    calendly_invitee_uri: invitee.uri,
    notes: [`Calendly · ${event.name}`, answers].filter(Boolean).join("\n"),
  });
  if (error && !isUniqueViolation(error)) throw new Error(error.message); // unique violation = another path created it first
  return error ? "unchanged" : "created";
}

/** Webhook entry point. */
export async function handleCalendlyEvent(ownerId: string, event: string, payload: InviteePayload) {
  if (event !== "invitee.created" && event !== "invitee.canceled") return "unchanged" as const;
  return applyBooking(ownerId, payload.scheduled_event, event === "invitee.canceled", async () => payload, !!payload.rescheduled);
}

/** Widget entry point: the embedded booking page reports the URIs of the booking that was just made. */
export async function importCalendlyBooking(ownerId: string, eventUri: string, inviteeUri: string) {
  if (!eventUri.startsWith(EVENT_PREFIX) || !inviteeUri.startsWith(`${eventUri}/invitees/`)) {
    throw new Error("This doesn't look like a Calendly booking.");
  }
  const integ = await getIntegration(ownerId);
  if (!integ) throw new Error("Connect Calendly in Settings → Integrations to import bookings.");
  const { resource: event } = await cjson<{ resource: CalendlyEvent }>(integ.access_token, eventUri);
  return applyBooking(ownerId, event, event.status === "canceled",
    async () => (await cjson<{ resource: CalendlyInvitee }>(integ.access_token, inviteeUri)).resource);
}

/**
 * Polling sync: every booking from 30 days ago to 6 months ahead. Invitees are only fetched for
 * bookings the dashboard doesn't know yet, which keeps the number of Calendly API calls low.
 * Returns the number of appointments created, moved or cancelled.
 */
export async function pullCalendlyEvents(ownerId: string): Promise<number> {
  const integ = await getIntegration(ownerId);
  if (!integ) return 0;
  const token = integ.access_token;
  const params = new URLSearchParams({
    user: integ.settings.user_uri,
    min_start_time: new Date(Date.now() - 30 * 86400_000).toISOString(),
    max_start_time: new Date(Date.now() + 183 * 86400_000).toISOString(),
    count: "100",
    sort: "start_time:asc",
  });

  let changed = 0;
  let next: string | null = `/scheduled_events?${params}`;
  while (next) {
    const page: { collection: CalendlyEvent[]; pagination: { next_page: string | null } } = await cjson(token, next);
    for (const event of page.collection ?? []) {
      const result = await applyBooking(ownerId, event, event.status === "canceled", async () => {
        const { collection } = await cjson<{ collection: CalendlyInvitee[] }>(token, `${event.uri}/invitees?count=100`);
        return collection.find((i) => i.status !== "canceled") ?? null;
      });
      if (result !== "unchanged") changed += 1;
    }
    next = page.pagination?.next_page ?? null;
  }

  await patchIntegrationSettings(ownerId, "calendly", { last_pull_at: new Date().toISOString(), last_sync_error: null });
  return changed;
}

/** Called by the webhook route after a verified delivery: proves instant sync works. */
export async function recordCalendlyWebhook(ownerId: string) {
  await patchIntegrationSettings(ownerId, "calendly", { last_webhook_at: new Date().toISOString(), webhook_state: "active" });
}

/** Asks Calendly whether our webhook subscription is still delivering (at most once an hour). */
async function refreshWebhookState(ownerId: string, integ: CalendlyIntegration): Promise<string | undefined> {
  const { webhook_uri, webhook_state, webhook_checked_at } = integ.settings;
  if (!webhook_uri) return undefined;
  if (webhook_checked_at && Date.now() - new Date(webhook_checked_at).getTime() < WEBHOOK_CHECK_MS) return webhook_state;
  const res = await cfetch(integ.access_token, webhook_uri).catch(() => null);
  if (!res) return webhook_state; // network error: keep the last known state
  const state = res.ok ? ((await res.json()) as { resource: { state: string } }).resource.state
    : res.status === 404 ? "missing" : webhook_state;
  await patchIntegrationSettings(ownerId, "calendly", { webhook_state: state, webhook_checked_at: new Date().toISOString() });
  return state;
}

/**
 * Automatic sync, called by the cron and by the open app every minute. Does nothing until a pull is due:
 * every 5 minutes when the webhook can't deliver (none, disabled, deleted), every 30 minutes as a safety
 * net when it can. Safe to call from several devices at once: bookings are keyed by event URI.
 */
export async function autoSyncCalendly(ownerId: string): Promise<{ ran: boolean; changed: number }> {
  const integ = await getIntegration(ownerId);
  if (!integ) return { ran: false, changed: 0 };
  const state = await refreshWebhookState(ownerId, integ);
  const interval = state === "active" ? CALENDLY_POLL_MS.withWebhook : CALENDLY_POLL_MS.withoutWebhook;
  const last = integ.settings.last_pull_at ? new Date(integ.settings.last_pull_at).getTime() : 0;
  if (Date.now() - last < interval) return { ran: false, changed: 0 };

  // claim the slot first so other devices / the cron skip this round
  await patchIntegrationSettings(ownerId, "calendly", { last_pull_at: new Date().toISOString() });
  try {
    return { ran: true, changed: await pullCalendlyEvents(ownerId) };
  } catch (e) {
    await patchIntegrationSettings(ownerId, "calendly", { last_sync_error: (e as Error).message });
    throw e;
  }
}

/** Cancels the booking on Calendly when it is cancelled from the dashboard. Never throws. */
export async function cancelOnCalendly(ownerId: string, eventUri: string, reason = "Cancelled by the salon") {
  try {
    const integ = await getIntegration(ownerId);
    if (!integ) return;
    await cfetch(integ.access_token, `${eventUri}/cancellation`, { method: "POST", body: JSON.stringify({ reason }) });
  } catch (e) {
    console.error("[calendly] cancel failed", e);
  }
}
